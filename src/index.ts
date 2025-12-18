import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { JSDOM } from 'jsdom';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

interface ChartRow {
    [key: string]: string;
}

const width = 600;
const height = 600;

const processRow = async (row: ChartRow) => {
    // Row is now an object with keys matching CSV headers
    const filename = row['Filename'];

    // Extract values for Field1 through Field5
    const possibleValues = [
        row['Field1'],
        row['Field2'],
        row['Field3'],
        row['Field4'],
        row['Field5']
    ];

    const dataValues = possibleValues
        .map(v => v ? parseFloat(v) : NaN)
        .filter(v => !isNaN(v));

    if (!filename || dataValues.length === 0) {
        console.error(`Invalid row data (need at least 1 valid value): ${JSON.stringify(row)}`);
        return;
    }

    const allLabels = ['Field 1', 'Field 2', 'Field 3', 'Field 4', 'Field 5'];
    const allBackgroundColors = [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
    ];
    const allBorderColors = [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
    ];

    // Setup JSDOM
    const dom = new JSDOM(`<!DOCTYPE html><body><canvas id="myChart" width="${width}" height="${height}"></canvas></body>`, {
        runScripts: "dangerously",
        resources: "usable",
        pretendToBeVisual: true
    });

    const window = dom.window;
    const document = window.document;

    // Polyfill globals for Chart.js
    // @ts-ignore
    global.window = window;
    // @ts-ignore
    global.document = document;
    // @ts-ignore
    global.HTMLElement = window.HTMLElement;
    // @ts-ignore
    global.HTMLCanvasElement = window.HTMLCanvasElement;
    // @ts-ignore
    global.Image = window.Image;

    // Chart Configuration
    const configuration: any = {
        type: 'pie',
        data: {
            labels: allLabels.slice(0, dataValues.length),
            datasets: [{
                data: dataValues,
                backgroundColor: allBackgroundColors.slice(0, dataValues.length),
                borderColor: allBorderColors.slice(0, dataValues.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: false,
            animation: false,
            devicePixelRatio: 1,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false,
                    text: `Chart for ${filename}`
                }
            }
        },
        plugins: [{
            id: 'custom_labels',
            afterDatasetsDraw: (chart: any) => {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset: any, i: number) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((element: any, index: number) => {
                        const value = dataset.data[index];
                        const valueStr = ` ${value.toString()}% `;
                        const { x, y } = element.tooltipPosition();

                        // Font calculation...
                        const startAngle = element.startAngle;
                        const endAngle = element.endAngle;
                        const angle = endAngle - startAngle;
                        const radius = element.outerRadius;
                        const midRadius = radius / 2;
                        const arcLength = midRadius * angle;
                        const availableHeight = radius * 0.4;
                        const sizeByWidth = arcLength / (valueStr.length * 0.6);
                        const sizeByHeight = availableHeight;
                        let fontSize = Math.min(sizeByWidth, sizeByHeight);
                        fontSize = Math.min(fontSize, 80);

                        ctx.save();
                        ctx.font = `bold ${Math.floor(fontSize)}px sans-serif`;
                        ctx.fillStyle = 'white';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(valueStr, x, y);
                        ctx.restore();
                    });
                });
            }
        }]
    };

    const canvas = document.getElementById('myChart') as any;
    const ctx = canvas.getContext('2d');

    // Create Chart
    new Chart(ctx, configuration);

    // Use toDataURL as fallback
    let imageBuffer: Buffer;
    if (typeof (canvas as any).toBuffer === 'function') {
        imageBuffer = (canvas as any).toBuffer('image/png');
    } else {
        const dataUrl = canvas.toDataURL('image/png');
        // If dataUrl is 'data:,' it means empty or not supported
        if (dataUrl === 'data:,') {
            console.error('Canvas toDataURL returned empty data. Canvas package might not be linked properly.');
        }
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
        imageBuffer = Buffer.from(base64, 'base64');
    }

    const outputPath = path.join(__dirname, '..', 'chart-images', `${filename}.png`);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`Saved ${outputPath}`);

    window.close();
};

const results: ChartRow[] = [];

fs.createReadStream(path.join(__dirname, '..', 'data', 'charts.csv'))
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
        for (const row of results) {
            try {
                await processRow(row);
            } catch (err) {
                console.error(`Error processing ${row['Filename']}:`, err);
            }
        }
    });
