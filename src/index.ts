import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { Chart, registerables, ChartConfiguration } from 'chart.js';
import { createCanvas } from 'canvas';

// Register Chart.js components
Chart.register(...registerables);

interface ChartRow {
    [key: string]: string;
}

const width = 600;
const height = 600;

// Helper to make Chart.js work with Node canvas
// @ts-ignore
global.CanvasGradient = function () { };
// @ts-ignore
global.CanvasPattern = function () { };

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

    // Chart Configuration
    const configuration: ChartConfiguration = {
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
            devicePixelRatio: 1, // Important for node-canvas one-to-one mapping
            events: [], // Disable events
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
            id: 'background',
            beforeDraw: (chart: any) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
            }
        }, {
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

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Create Chart
    // @ts-ignore
    new Chart(ctx, configuration);

    const imageBuffer = canvas.toBuffer('image/png');

    const outputPath = path.join(__dirname, '..', 'chart-images', `${filename}.png`);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, imageBuffer);
    console.log(`Saved ${outputPath}`);
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
