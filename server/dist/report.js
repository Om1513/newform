"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runReport = runReport;
exports.buildPayload = buildPayload;
exports.extractRows = extractRows;
exports.computeNextRunISO = computeNextRunISO;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const chartjs_node_canvas_1 = require("chartjs-node-canvas");
const puppeteer_1 = __importDefault(require("puppeteer"));
const store_1 = require("./store");
const openai_1 = __importDefault(require("openai"));
const resend_1 = require("resend");
const REPORT_DIR = path_1.default.resolve(process.cwd(), "reports");
const SERVER_PUBLIC_BASE = process.env.SERVER_PUBLIC_BASE ?? "http://localhost:4000";
const NEWFORM_API_BASE = process.env.NEWFORM_API_BASE ?? "https://bizdev.newform.ai";
const NEWFORM_API_TOKEN = process.env.NEWFORM_API_TOKEN ?? "NEWFORMCODINGCHALLENGE";
const NEWFORM_AUTH_HEADER_NAME = process.env.NEWFORM_AUTH_HEADER_NAME ?? "Authorization";
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
// Initialize Chart.js canvas renderer
const chartRenderer = new chartjs_node_canvas_1.ChartJSNodeCanvas({
    width: 800,
    height: 600,
    backgroundColour: 'white'
});
/** Build and deliver one report, updating store.status */
async function runReport() {
    if (!store_1.store.config)
        throw new Error("No config saved");
    const cfg = store_1.store.config;
    // 1) Fetch data with enhanced payload
    const payload = buildPayload(cfg);
    const url = `${NEWFORM_API_BASE}/sample-data/${cfg.platform}`;
    const resp = await axios_1.default.post(url, payload, {
        headers: {
            "Content-Type": "application/json",
            [NEWFORM_AUTH_HEADER_NAME]: NEWFORM_API_TOKEN,
        },
        timeout: 30000,
        validateStatus: () => true,
    });
    if (resp.status < 200 || resp.status >= 300) {
        const body = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
        throw new Error(`Upstream ${cfg.platform} ${resp.status}: ${body}`);
    }
    const rows = extractRows(resp.data);
    // 2) Enhanced data analysis
    const analysis = await analyzeData(rows, cfg);
    // 3) Generate multiple charts based on analysis
    const charts = await generateCharts(analysis, cfg);
    // 4) Enhanced LLM analysis with full context
    const aiAnalysis = await generateAIAnalysis(analysis, cfg);
    // 5) Build comprehensive HTML report
    const html = await renderEnhancedHtml({
        config: cfg,
        analysis,
        charts,
        aiAnalysis,
        timestamp: new Date().toISOString()
    });
    // 6) Save and deliver
    ensureDir(REPORT_DIR);
    const timestamp = Date.now();
    const htmlFilename = `report-${timestamp}.html`;
    const pdfFilename = `report-${timestamp}.pdf`;
    const htmlPath = path_1.default.join(REPORT_DIR, htmlFilename);
    const pdfPath = path_1.default.join(REPORT_DIR, pdfFilename);
    // Save HTML version
    fs_1.default.writeFileSync(htmlPath, html, "utf8");
    const htmlUrl = `${SERVER_PUBLIC_BASE}/reports/${htmlFilename}`;
    let pdfUrl = null;
    // Generate PDF version with proper styling (with fallback)
    try {
        const pdfBuffer = await generatePDF(html);
        fs_1.default.writeFileSync(pdfPath, pdfBuffer);
        pdfUrl = `${SERVER_PUBLIC_BASE}/reports/${pdfFilename}`;
        console.log('PDF generated successfully:', pdfFilename);
    }
    catch (error) {
        console.error('PDF generation failed, continuing with HTML only:', error);
        // Don't fail the entire report generation if PDF fails
    }
    store_1.store.updateStatus({
        latestPublicUrl: htmlUrl,
        latestPdfUrl: pdfUrl
    });
    if (cfg.delivery === "email") {
        console.log('Email delivery requested...');
        const apiKey = process.env.RESEND_API_KEY;
        const from = process.env.RESEND_FROM;
        console.log('Environment check:', {
            hasApiKey: !!apiKey,
            hasFrom: !!from,
            emailAddress: cfg.email
        });
        if (!apiKey) {
            console.error("RESEND_API_KEY environment variable not set");
            throw new Error("RESEND_API_KEY not set. Please configure your Resend API key.");
        }
        if (!from) {
            console.error("RESEND_FROM environment variable not set");
            throw new Error("RESEND_FROM not set. Please configure your sender email address.");
        }
        if (!cfg.email) {
            console.error("No email address provided in config");
            throw new Error("Email not provided in config");
        }
        try {
            // Send email with HTML body and PDF attachment (if available)
            const emailOptions = {
                from,
                to: [cfg.email],
                subject: `📊 ${cfg.platform.toUpperCase()} Insight Report - ${new Date().toLocaleDateString()}`,
                html
            };
            // Add PDF attachment only if PDF was successfully generated
            if (pdfUrl && fs_1.default.existsSync(pdfPath)) {
                console.log('Adding PDF attachment to email...');
                emailOptions.attachments = [
                    {
                        filename: `${cfg.platform}-insight-report-${new Date().toISOString().split('T')[0]}.pdf`,
                        content: fs_1.default.readFileSync(pdfPath)
                    }
                ];
            }
            console.log('Sending email to:', cfg.email);
            const result = await resend.emails.send(emailOptions);
            console.log('Email sent successfully:', result);
            return { url: htmlUrl, pdfUrl, emailed: true };
        }
        catch (error) {
            console.error('Email sending failed:', error);
            throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    return { url: htmlUrl, pdfUrl };
}
/** Build payloads that exactly follow the challenge spec:
 *  - Lowercase dateRangeEnum: "last7" | "last14" | "last30" | "lifetime"
 *  - Raw Authorization header (no "Bearer ")
 *  - No TikTok reportType (kept optional, omit to avoid 422s)
 */
function buildPayload(cfg) {
    if (cfg.platform === "tiktok") {
        // TikTok per spec - using lowercase dateRangeEnum as per API documentation
        return {
            metrics: cfg.metrics, // array (allowed list)
            dimensions: ["stat_time_day"], // valid dimension for time series
            level: cfg.level, // "AUCTION_ADVERTISER" | "AUCTION_AD" | "AUCTION_CAMPAIGN"
            dateRangeEnum: cfg.dateRangeEnum, // use lowercase: "last7", "last14", "last30"
            reportType: "BASIC" // explicitly set report type
        };
    }
    // Meta per spec
    return {
        metrics: cfg.metrics, // array (allowed list)
        level: cfg.level, // "account" | "campaign" | "adset" | "ad"
        breakdowns: [], // allowed empty
        timeIncrement: "7", // valid per spec; keeps server happy
        dateRangeEnum: cfg.dateRangeEnum, // lower-case per working tests
    };
}
/** Extract rows robustly from unknown sample payload shapes */
function extractRows(data) {
    console.log("Extracting rows from data:", JSON.stringify(data, null, 2));
    if (!data) {
        console.log("No data provided");
        return [];
    }
    if (Array.isArray(data)) {
        console.log(`Found array with ${data.length} items`);
        return data;
    }
    if (Array.isArray(data.rows)) {
        console.log(`Found data.rows with ${data.rows.length} items`);
        return data.rows;
    }
    if (Array.isArray(data.data)) {
        console.log(`Found data.data with ${data.data.length} items`);
        return data.data;
    }
    if (Array.isArray(data.results)) {
        console.log(`Found data.results with ${data.results.length} items`);
        return data.results;
    }
    if (Array.isArray(data.list)) {
        console.log(`Found data.list with ${data.list.length} items`);
        return data.list;
    }
    // Try single object
    if (typeof data === "object" && data !== null) {
        console.log("Treating as single object");
        return [data];
    }
    console.log("No recognizable data structure found");
    return [];
}
/** Enhanced data analysis with trends and insights */
async function analyzeData(rows, config) {
    console.log(`Analyzing ${rows.length} rows for ${config.platform} with metrics:`, config.metrics);
    console.log(`Sample row structure:`, JSON.stringify(rows[0], null, 2));
    // Basic totals
    const totals = {};
    for (const metric of config.metrics) {
        totals[metric] = 0;
    }
    // Calculate totals and gather raw values for trend analysis
    const timeSeriesData = {};
    for (const row of rows) {
        for (const metric of config.metrics) {
            // Handle different data structures for Meta vs TikTok
            let val;
            let dateField;
            if (row.metrics && row.dimensions) {
                // TikTok structure: { dimensions: { stat_time_day: "..." }, metrics: { metric: "value" } }
                val = Number(row.metrics[metric]);
                dateField = row.dimensions.stat_time_day;
            }
            else {
                // Meta structure: { metric: "value", date_start: "..." }
                val = Number(row[metric]);
                dateField = row.stat_time_day || row.date_start || row.date;
            }
            if (!Number.isNaN(val)) {
                totals[metric] += val;
                // Track time series if date available
                if (dateField) {
                    if (!timeSeriesData[metric])
                        timeSeriesData[metric] = [];
                    timeSeriesData[metric].push({ date: dateField, value: val });
                }
            }
        }
    }
    // Round totals
    for (const metric of config.metrics) {
        totals[metric] = Math.round((totals[metric] + Number.EPSILON) * 100) / 100;
    }
    // Calculate trends (simple growth rates)
    const trends = {};
    for (const metric of config.metrics) {
        if (timeSeriesData[metric] && timeSeriesData[metric].length > 1) {
            const series = timeSeriesData[metric].sort((a, b) => a.date.localeCompare(b.date));
            const first = series[0].value;
            const last = series[series.length - 1].value;
            trends[metric] = first > 0 ? ((last - first) / first) * 100 : 0;
        }
        else {
            trends[metric] = 0;
        }
    }
    // Generate basic insights
    const insights = [];
    const sortedMetrics = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (sortedMetrics.length > 0) {
        insights.push(`Highest performing metric: ${sortedMetrics[0][0]} (${formatNumber(sortedMetrics[0][1])})`);
    }
    // Trend insights
    const growingMetrics = Object.entries(trends).filter(([_, growth]) => growth > 5);
    const decliningMetrics = Object.entries(trends).filter(([_, growth]) => growth < -5);
    if (growingMetrics.length > 0) {
        insights.push(`Growing metrics: ${growingMetrics.map(([metric, growth]) => `${metric} (+${growth.toFixed(1)}%)`).join(', ')}`);
    }
    if (decliningMetrics.length > 0) {
        insights.push(`Declining metrics: ${decliningMetrics.map(([metric, growth]) => `${metric} (${growth.toFixed(1)}%)`).join(', ')}`);
    }
    // Determine recommended charts
    const recommendedCharts = determineChartTypes(config.metrics, totals, trends);
    return {
        totals,
        trends,
        insights,
        recommendedCharts,
        rawData: rows
    };
}
/** Determine optimal chart types based on data characteristics */
function determineChartTypes(metrics, totals, trends) {
    const charts = [];
    // Always include overview bar chart
    charts.push({
        type: 'bar',
        title: 'Metrics Overview',
        description: 'Comparison of all selected metrics',
        metrics: metrics
    });
    // Add pie chart if we have cost and conversion metrics
    const hasCostMetrics = metrics.some(m => m.includes('cost') || m.includes('spend'));
    const hasConversionMetrics = metrics.some(m => m.includes('conversion') || m.includes('click'));
    if (hasCostMetrics && hasConversionMetrics) {
        charts.push({
            type: 'doughnut',
            title: 'Performance Distribution',
            description: 'Breakdown of key performance indicators',
            metrics: metrics.filter(m => m.includes('spend') || m.includes('conversion') || m.includes('click')).slice(0, 5)
        });
    }
    // Add trend line chart if we have time-sensitive data
    const trendingMetrics = Object.entries(trends).filter(([_, trend]) => Math.abs(trend) > 1);
    if (trendingMetrics.length > 0) {
        charts.push({
            type: 'line',
            title: 'Trend Analysis',
            description: 'Metrics showing significant changes over time',
            metrics: trendingMetrics.map(([metric]) => metric).slice(0, 4)
        });
    }
    return charts;
}
/** Format numbers for display */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    else if (num < 1 && num > 0) {
        return num.toFixed(3);
    }
    else {
        return num.toFixed(2);
    }
}
/** Generate PDF from HTML with optimized styling for print */
async function generatePDF(html) {
    let browser;
    try {
        browser = await puppeteer_1.default.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        const page = await browser.newPage();
        // Set viewport for consistent rendering
        await page.setViewport({
            width: 1200,
            height: 800,
            deviceScaleFactor: 2
        });
        // Enhance HTML for PDF with print-specific styles
        const pdfOptimizedHtml = enhanceHtmlForPDF(html);
        // Set content and wait for images to load
        await page.setContent(pdfOptimizedHtml, {
            waitUntil: ['networkidle0', 'load']
        });
        // Generate PDF with professional settings
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm'
            },
            displayHeaderFooter: true,
            headerTemplate: `
        <div style="font-size: 10px; color: #666; width: 100%; text-align: center; margin-top: 10px;">
          <span style="font-weight: 600;">Scheduled Insight Reports</span>
        </div>
      `,
            footerTemplate: `
        <div style="font-size: 9px; color: #666; width: 100%; display: flex; justify-content: space-between; margin: 0 15mm;">
          <span>Generated on ${new Date().toLocaleDateString()}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
            preferCSSPageSize: false
        });
        return Buffer.from(pdfBuffer);
    }
    catch (error) {
        console.error('PDF generation failed:', error);
        throw new Error('Failed to generate PDF report');
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
}
/** Enhance HTML with PDF-specific optimizations */
function enhanceHtmlForPDF(html) {
    // Add print-specific CSS and optimize for PDF rendering
    const pdfStyles = `
    <style>
      /* PDF-specific styles */
      @media print {
        body {
          background: white !important;
          color: #000 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .container {
          box-shadow: none !important;
          border-radius: 0 !important;
          margin: 0 !important;
          max-width: none !important;
        }
        
        .header {
          background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%) !important;
          color: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          page-break-inside: avoid;
        }
        
        .section {
          page-break-inside: avoid;
          margin: 20px 0 !important;
          background: #FAFBFC !important;
          border-radius: 12px !important;
          border-left: 4px solid #3B82F6 !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        /* Ensure charts render properly */
        img {
          max-width: 100% !important;
          height: auto !important;
          page-break-inside: avoid;
        }
        
        /* Table styling for PDF */
        table {
          page-break-inside: avoid;
          border-collapse: collapse !important;
        }
        
        thead {
          display: table-header-group;
        }
        
        tr {
          page-break-inside: avoid;
        }
        
        /* Optimize font sizes for print */
        h1 { font-size: 24px !important; }
        h2 { font-size: 18px !important; }
        h3 { font-size: 16px !important; }
        p, li, td { font-size: 12px !important; line-height: 1.4 !important; }
        
        /* Text content formatting for PDF */
        .text-content {
          white-space: normal !important;
          line-height: 1.6 !important;
          padding: 16px !important;
          background: white !important;
          border-radius: 8px !important;
        }
        
        .text-content strong {
          font-weight: 700 !important;
          color: #000 !important;
        }
        
        .text-content ul {
          margin: 0 !important;
          padding-left: 20px !important;
        }
        
        .text-content li {
          display: list-item !important;
          margin-bottom: 12px !important;
          padding: 0 !important;
          line-height: 1.5 !important;
        }
        
        .text-content li:last-child {
          margin-bottom: 0 !important;
        }
        
        /* Page breaks */
        .page-break {
          page-break-before: always;
        }
        
        /* Ensure proper spacing */
        .content {
          padding: 15px !important;
        }
        
        /* Chart containers */
        div[style*="margin: 32px 0"] {
          margin: 20px 0 !important;
          page-break-inside: avoid;
        }
      }
      
      /* Force color printing */
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Optimize for PDF rendering */
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
        background: white;
      }
      
      /* Ensure proper chart rendering */
      img[src^="data:image"] {
        display: block;
        margin: 10px auto;
        max-width: 90%;
        height: auto;
      }
    </style>
  `;
    // Insert PDF styles right after the existing styles
    const styleEndIndex = html.indexOf('</style>') + 8;
    if (styleEndIndex > 7) {
        return html.slice(0, styleEndIndex) + pdfStyles + html.slice(styleEndIndex);
    }
    else {
        // If no existing styles found, add after head
        const headEndIndex = html.indexOf('</head>');
        if (headEndIndex > -1) {
            return html.slice(0, headEndIndex) + pdfStyles + html.slice(headEndIndex);
        }
    }
    return html;
}
function aggregateTotals(rows, metrics) {
    const totals = {};
    for (const m of metrics)
        totals[m] = 0;
    for (const row of rows) {
        for (const m of metrics) {
            // Handle different data structures for Meta vs TikTok
            let val;
            if (row.metrics && row.dimensions) {
                // TikTok structure: { dimensions: { stat_time_day: "..." }, metrics: { metric: "value" } }
                val = Number(row.metrics[m]);
            }
            else {
                // Meta structure: { metric: "value", date_start: "..." }
                val = Number(row[m]);
            }
            if (!Number.isNaN(val))
                totals[m] += val;
        }
    }
    // Round to 2 decimals
    for (const m of metrics)
        totals[m] = Math.round((totals[m] + Number.EPSILON) * 100) / 100;
    return totals;
}
/** Generate multiple charts using Chart.js */
async function generateCharts(analysis, config) {
    const charts = [];
    for (const chartConfig of analysis.recommendedCharts) {
        try {
            const chartData = prepareChartData(chartConfig, analysis);
            const chartImage = await createChart(chartConfig, chartData);
            charts.push({
                type: chartConfig.type,
                title: chartConfig.title,
                description: chartConfig.description,
                image: chartImage
            });
        }
        catch (error) {
            console.error(`Failed to generate chart ${chartConfig.title}:`, error);
        }
    }
    return charts;
}
/** Prepare data for specific chart type */
function prepareChartData(chartConfig, analysis) {
    const relevantMetrics = chartConfig.metrics.filter(metric => analysis.totals[metric] !== undefined);
    const data = relevantMetrics.map(metric => analysis.totals[metric]);
    const labels = relevantMetrics.map(metric => metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    return { data, labels, metrics: relevantMetrics };
}
/** Create chart using Chart.js */
async function createChart(chartConfig, chartData) {
    const colors = [
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    let configuration;
    switch (chartConfig.type) {
        case 'bar':
            configuration = {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                            label: 'Values',
                            data: chartData.data,
                            backgroundColor: colors.slice(0, chartData.data.length),
                            borderColor: colors.slice(0, chartData.data.length),
                            borderWidth: 1
                        }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: chartConfig.title,
                            font: { size: 18 }
                        },
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return formatNumber(Number(value));
                                }
                            }
                        }
                    }
                }
            };
            break;
        case 'doughnut':
        case 'pie':
            configuration = {
                type: chartConfig.type,
                data: {
                    labels: chartData.labels,
                    datasets: [{
                            data: chartData.data,
                            backgroundColor: colors.slice(0, chartData.data.length),
                            borderWidth: 2,
                            borderColor: '#ffffff'
                        }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: chartConfig.title,
                            font: { size: 18 }
                        },
                        legend: {
                            position: 'bottom',
                            labels: { boxWidth: 12 }
                        }
                    }
                }
            };
            break;
        case 'line':
            configuration = {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                            label: 'Trend',
                            data: chartData.data,
                            borderColor: '#3B82F6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4
                        }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: chartConfig.title,
                            font: { size: 18 }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function (value) {
                                    return formatNumber(Number(value));
                                }
                            }
                        }
                    }
                }
            };
            break;
        default:
            throw new Error(`Unsupported chart type: ${chartConfig.type}`);
    }
    const imageBuffer = await chartRenderer.renderToBuffer(configuration);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
}
/** Enhanced AI analysis with comprehensive data context */
async function generateAIAnalysis(analysis, config) {
    if (!process.env.OPENAI_API_KEY) {
        return {
            executiveSummary: defaultSummary(analysis.totals, config.platform, config.dateRangeEnum, config.level),
            keyInsights: analysis.insights,
            recommendations: generateDefaultRecommendations(analysis, config),
            chartExplanations: analysis.recommendedCharts.map(chart => ({
                title: chart.title,
                explanation: `${chart.description} - showing ${chart.metrics.join(', ')}`
            }))
        };
    }
    try {
        // Prepare comprehensive context for LLM
        const context = {
            platform: config.platform,
            dateRange: config.dateRangeEnum,
            level: config.level,
            metrics: config.metrics,
            totals: analysis.totals,
            trends: analysis.trends,
            insights: analysis.insights,
            dataPoints: analysis.rawData.length,
            topMetrics: Object.entries(analysis.totals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([metric, value]) => ({ metric, value: formatNumber(value) })),
            chartTypes: analysis.recommendedCharts.map(c => ({ type: c.type, title: c.title, metrics: c.metrics }))
        };
        const systemPrompt = `You are an expert digital advertising analyst specializing in ${config.platform} campaigns. 
Your role is to provide actionable insights from advertising performance data.

Key expertise areas:
- Performance marketing metrics and KPIs
- Campaign optimization strategies  
- Trend analysis and forecasting
- ROI and efficiency improvements
- Platform-specific best practices

Always provide data-driven, actionable insights that help improve campaign performance.`;
        const userPrompt = `Analyze this ${config.platform} advertising performance data and provide comprehensive insights:

CAMPAIGN CONTEXT:
- Platform: ${config.platform.toUpperCase()}
- Time Period: ${config.dateRangeEnum.replace('last', 'Last ')} days
- Analysis Level: ${config.level}
- Data Points Analyzed: ${analysis.rawData.length} records

PERFORMANCE METRICS:
${Object.entries(analysis.totals).map(([metric, value]) => `- ${metric.replace(/_/g, ' ').toUpperCase()}: ${formatNumber(value)}`).join('\n')}

TREND ANALYSIS:
${Object.entries(analysis.trends).map(([metric, trend]) => `- ${metric}: ${trend > 0 ? '+' : ''}${trend.toFixed(1)}% change`).join('\n')}

PRELIMINARY INSIGHTS:
${analysis.insights.map(insight => `- ${insight}`).join('\n')}

REQUESTED ANALYSIS:
Please provide a comprehensive report with the following sections:

1. EXECUTIVE SUMMARY (3-4 sentences):
   - Overall performance assessment
   - Key wins and concerns
   - Primary takeaways

2. KEY INSIGHTS (3-5 bullet points):
   - Most important findings from the data
   - Performance patterns and anomalies
   - Cost efficiency observations

3. ACTIONABLE RECOMMENDATIONS (3-5 bullet points):
   - Specific optimization opportunities
   - Budget reallocation suggestions
   - Targeting or creative improvements

4. CHART EXPLANATIONS:
   For each chart type: ${analysis.recommendedCharts.map(c => c.title).join(', ')}
   - Why this visualization is valuable
   - What to look for in the data
   - How to interpret the results

Format your response as a structured analysis that helps drive better campaign performance.`;
        const resp = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 1200
        });
        const aiResponse = resp.choices?.[0]?.message?.content?.trim();
        if (aiResponse) {
            // Parse the structured response
            const sections = parseAIResponse(aiResponse);
            return {
                executiveSummary: sections.executiveSummary || defaultSummary(analysis.totals, config.platform, config.dateRangeEnum, config.level),
                keyInsights: sections.keyInsights || analysis.insights,
                recommendations: sections.recommendations || generateDefaultRecommendations(analysis, config),
                chartExplanations: sections.chartExplanations || analysis.recommendedCharts.map(chart => ({
                    title: chart.title,
                    explanation: chart.description
                }))
            };
        }
    }
    catch (error) {
        console.error('AI analysis failed:', error);
    }
    // Fallback to default analysis
    return {
        executiveSummary: defaultSummary(analysis.totals, config.platform, config.dateRangeEnum, config.level),
        keyInsights: analysis.insights,
        recommendations: generateDefaultRecommendations(analysis, config),
        chartExplanations: analysis.recommendedCharts.map(chart => ({
            title: chart.title,
            explanation: chart.description
        }))
    };
}
/** Parse structured AI response */
function parseAIResponse(response) {
    const sections = {};
    // Extract executive summary
    const execMatch = response.match(/(?:EXECUTIVE SUMMARY|1\.\s*EXECUTIVE SUMMARY)[:\s]*(.*?)(?=(?:\n\s*(?:\d+\.|##)|$))/si);
    if (execMatch) {
        sections.executiveSummary = cleanupText(execMatch[1]);
    }
    // Extract key insights
    const insightsMatch = response.match(/(?:KEY INSIGHTS|2\.\s*KEY INSIGHTS)[:\s]*(.*?)(?=(?:\n\s*(?:\d+\.|##)|$))/si);
    if (insightsMatch) {
        sections.keyInsights = extractBulletPoints(insightsMatch[1]);
    }
    // Extract recommendations
    const recoMatch = response.match(/(?:ACTIONABLE RECOMMENDATIONS|3\.\s*ACTIONABLE RECOMMENDATIONS)[:\s]*(.*?)(?=(?:\n\s*(?:\d+\.|##)|$))/si);
    if (recoMatch) {
        sections.recommendations = extractBulletPoints(recoMatch[1]);
    }
    return sections;
}
/** Clean up text content */
function cleanupText(text) {
    return text
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\n{2,}/g, '\n\n')
        .replace(/^\s*[-•]\s*/, ''); // Remove leading bullet points
}
/** Extract bullet points from text */
function extractBulletPoints(text) {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || /^\d+\./.test(line))
        .map(line => line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean);
}
/** Generate default recommendations based on data analysis */
function generateDefaultRecommendations(analysis, config) {
    const recommendations = [];
    // Performance-based recommendations
    const sortedMetrics = Object.entries(analysis.totals).sort((a, b) => b[1] - a[1]);
    const topMetric = sortedMetrics[0];
    if (topMetric && topMetric[0].includes('spend')) {
        recommendations.push(`Monitor spending efficiency - ${topMetric[0]} represents ${formatNumber(topMetric[1])} of total budget allocation`);
    }
    // Trend-based recommendations
    const decliners = Object.entries(analysis.trends).filter(([_, trend]) => trend < -10);
    if (decliners.length > 0) {
        recommendations.push(`Address declining metrics: ${decliners.map(([metric]) => metric).join(', ')} show negative trends`);
    }
    const growers = Object.entries(analysis.trends).filter(([_, trend]) => trend > 15);
    if (growers.length > 0) {
        recommendations.push(`Scale successful campaigns - ${growers.map(([metric]) => metric).join(', ')} show strong positive momentum`);
    }
    // Platform-specific recommendations
    if (config.platform === 'meta') {
        recommendations.push('Consider A/B testing different ad creative formats to improve engagement rates');
    }
    else if (config.platform === 'tiktok') {
        recommendations.push('Leverage trending hashtags and music to increase organic reach and engagement');
    }
    return recommendations;
}
async function summarizeLLM(input) {
    const { platform, dateRange, level, totals } = input;
    return defaultSummary(totals, platform, dateRange, level);
}
function defaultSummary(totals, platform, dateRange, level) {
    const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    const topMetric = top ? `${top[0]}=${top[1]}` : "n/a";
    return [
        `• ${platform} ${dateRange} at ${level} level processed successfully.`,
        `• Highest total metric: ${topMetric}.`,
        `• Review chart for quick relative magnitudes.`
    ].join("\n");
}
/** Render a simple bar chart as inline SVG */
function makeBarSvg(totals) {
    const entries = Object.entries(totals);
    const width = 640;
    const barH = 26;
    const gap = 12;
    const pad = 16;
    const labelW = 160;
    const chartW = width - pad * 2 - labelW;
    const height = pad * 2 + entries.length * (barH + gap) - gap;
    const max = Math.max(...entries.map(([, v]) => v), 1);
    const bars = entries
        .map(([k, v], i) => {
        const y = pad + i * (barH + gap);
        const w = Math.round((v / max) * chartW);
        return `
        <g>
          <text x="${pad}" y="${y + barH - 6}" font-family="sans-serif" font-size="12" fill="#111">${escapeHtml(k)}</text>
          <rect x="${pad + labelW}" y="${y}" width="${w}" height="${barH}" fill="#6b7280"></rect>
          <text x="${pad + labelW + w + 6}" y="${y + barH - 6}" font-family="sans-serif" font-size="12" fill="#111">${v}</text>
        </g>
      `;
    })
        .join("\n");
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#fff"/>
  ${bars}
</svg>`;
}
/** Render enhanced HTML report with multiple charts and AI analysis */
async function renderEnhancedHtml(params) {
    const { config, analysis, charts, aiAnalysis, timestamp } = params;
    const title = `📊 ${config.platform.toUpperCase()} Insight Report - ${config.dateRangeEnum.toUpperCase()}`;
    const reportDate = new Date(timestamp).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    // Prepare metrics summary table
    const metricsRows = Object.entries(analysis.totals)
        .sort((a, b) => b[1] - a[1])
        .map(([metric, value]) => {
        const trend = analysis.trends[metric] || 0;
        const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '➖';
        const trendColor = trend > 0 ? '#10B981' : trend < 0 ? '#EF4444' : '#6B7280';
        return `
        <tr style="border-bottom: 1px solid #E5E7EB;">
          <td style="padding: 12px; font-weight: 600; color: #374151;">
            ${escapeHtml(metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))}
          </td>
          <td style="padding: 12px; text-align: right; font-weight: 700; color: #111827;">
            ${formatNumber(value)}
          </td>
          <td style="padding: 12px; text-align: center; color: ${trendColor};">
            ${trendIcon} ${trend > 0 ? '+' : ''}${trend.toFixed(1)}%
          </td>
        </tr>
      `;
    })
        .join('');
    // Prepare charts HTML
    const chartsHtml = charts.map(chart => `
    <div style="margin: 32px 0; padding: 24px; background: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB;">
      <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 18px; font-weight: 700;">
        ${escapeHtml(chart.title)}
      </h3>
      <p style="margin: 0 0 16px 0; color: #6B7280; font-size: 14px;">
        ${escapeHtml(chart.description)}
      </p>
      <div style="text-align: center; margin: 16px 0;">
        <img src="${chart.image}" alt="${escapeHtml(chart.title)}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" />
      </div>
    </div>
  `).join('');
    // Prepare insights and recommendations
    const insightsHtml = (aiAnalysis.keyInsights || [])
        .map((insight) => `
      <li>
        ${formatTextWithLineBreaks(insight)}
      </li>
    `).join('');
    const recommendationsHtml = (aiAnalysis.recommendations || [])
        .map((rec) => `
      <li>
        ${formatTextWithLineBreaks(rec)}
      </li>
    `).join('');
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #111827;
      background: linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%);
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%);
      color: white;
      padding: 32px;
      text-align: center;
    }
    .content {
      padding: 32px;
    }
    .section {
      margin: 32px 0;
      padding: 24px;
      background: #FAFBFC;
      border-radius: 12px;
      border-left: 4px solid #3B82F6;
      page-break-inside: avoid;
    }
    .text-content {
      background: white;
      padding: 16px;
      border-radius: 8px;
      line-height: 1.6;
      white-space: normal;
    }
    .text-content strong {
      color: #1F2937;
      font-weight: 600;
    }
    .text-content p {
      margin: 0 0 16px 0;
    }
    .text-content ul {
      margin: 0;
      padding-left: 20px;
    }
    .text-content li {
      display: list-item;
      margin-bottom: 12px;
      line-height: 1.5;
    }
    .text-content li:last-child {
      margin-bottom: 0;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 24px 0;
    }
    .metric-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #E5E7EB;
      text-align: center;
    }
    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin: 8px 0;
    }
    .metric-label {
      font-size: 12px;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">
        ${escapeHtml(title)}
      </h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">
        Generated on ${reportDate} • ${config.level} Level Analysis
      </p>
    </div>

    <div class="content">
      <!-- Executive Summary -->
      <div class="section">
        <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 700;">
          📋 Executive Summary
        </h2>
        <div class="text-content">
          ${formatTextWithLineBreaks(aiAnalysis.executiveSummary)}
        </div>
      </div>

      <!-- Key Metrics Overview -->
      <div class="section">
        <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 700;">
          📊 Performance Metrics
        </h2>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background: #F3F4F6;">
                <th style="padding: 16px; text-align: left; font-weight: 700; color: #374151;">Metric</th>
                <th style="padding: 16px; text-align: right; font-weight: 700; color: #374151;">Total Value</th>
                <th style="padding: 16px; text-align: center; font-weight: 700; color: #374151;">Trend</th>
              </tr>
            </thead>
            <tbody>
              ${metricsRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Data Visualizations -->
      <div class="section">
        <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 700;">
          📈 Data Visualizations
        </h2>
        ${chartsHtml}
      </div>

      <!-- Key Insights -->
      <div class="section">
        <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 700;">
          💡 Key Insights
        </h2>
        <div class="text-content">
          <ul>
            ${insightsHtml}
          </ul>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="section">
        <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 700;">
          🎯 Actionable Recommendations
        </h2>
        <div class="text-content">
          <ul>
            ${recommendationsHtml}
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 14px;">
        <p style="margin: 0;">
          Report generated by Scheduled Insight Reports • 
          Data analyzed: ${analysis.rawData.length} records • 
          Platform: ${config.platform.toUpperCase()}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
function renderHtml(params) {
    // Fallback function - should not be used with new system
    const fallbackConfig = {
        platform: 'meta',
        dateRangeEnum: 'last7',
        level: 'campaign',
        metrics: Object.keys(params.totals),
        cadence: 'manual',
        delivery: 'link'
    };
    return renderEnhancedHtml({
        config: fallbackConfig,
        analysis: { totals: params.totals, trends: {}, insights: [params.summary], recommendedCharts: [], rawData: [] },
        charts: [{ type: 'bar', title: 'Overview', image: 'data:image/svg+xml;base64,' + Buffer.from(params.chartSvg).toString('base64'), description: 'Basic chart' }],
        aiAnalysis: { executiveSummary: params.summary, keyInsights: [], recommendations: [], chartExplanations: [] },
        timestamp: new Date().toISOString()
    });
}
function ensureDir(dir) {
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
}
function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
/** Format text with proper line breaks and structure for HTML */
function formatTextWithLineBreaks(text) {
    if (!text)
        return '';
    // Escape HTML first
    let formatted = escapeHtml(text);
    // Handle common patterns that need line breaks
    formatted = formatted
        // Break on numbered sections (## 1., ## 2., etc.)
        .replace(/##\s*(\d+)\.\s*/g, '\n\n<strong>$1.</strong> ')
        // Break on bullet points with ** formatting
        .replace(/\*\*([^*]+)\*\*:/g, '\n\n<strong>$1:</strong>')
        // Break on sections like "KEY INSIGHTS", "ACTIONABLE RECOMMENDATIONS"
        .replace(/(KEY INSIGHTS|ACTIONABLE RECOMMENDATIONS|EXECUTIVE SUMMARY)/g, '\n\n<strong>$1</strong>\n')
        // Break on dash bullet points
        .replace(/\s*-\s*\*\*([^*]+)\*\*:/g, '\n\n• <strong>$1:</strong>')
        // Convert remaining ** to <strong> tags
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        // Break on sentences ending with periods followed by capital letters
        .replace(/\.\s+([A-Z])/g, '.\n\n$1')
        // Clean up multiple line breaks
        .replace(/\n{3,}/g, '\n\n')
        // Trim whitespace
        .trim();
    return formatted;
}
/** Helper to compute next run timestamp from cadence (simple) */
function computeNextRunISO(cadence) {
    const now = Date.now();
    const ms = cadence === "hourly" ? 60 * 60 * 1000 :
        cadence === "every 12 hours" ? 12 * 60 * 60 * 1000 :
            cadence === "daily" ? 24 * 60 * 60 * 1000 :
                0;
    return ms ? new Date(now + ms).toISOString() : null;
}
