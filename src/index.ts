import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const width = 600;
const height = 600;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

interface ChartRow {
    [key: string]: string;
}

const processRow = async (row: ChartRow) => {
    // Row is now an object with keys matching CSV headers
    const filename = row['Filename'];

    // Extract values for Field1 through Field5, filtering out invalid numbers
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

    const configuration = {
        type: 'pie' as const,
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
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: `Chart for ${filename}`
                }
            }
        }
    };

    const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    const outputPath = path.join(__dirname, '..', 'chart-images', `${filename}.png`);
    fs.writeFileSync(outputPath, image);
    console.log(`Saved ${outputPath}`);
};

const results: ChartRow[] = [];

fs.createReadStream(path.join(__dirname, '..', 'data', 'charts.csv'))
    .pipe(csv()) // Default (headers: true)
    .on('data', (data) => results.push(data))
    .on('end', async () => {
        for (const row of results) {
            await processRow(row);
        }
    });
