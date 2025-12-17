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
    // Determine keys from the row object
    // Assuming CSV doesn't have headers, csv-parser might generate keys like '0', '1', etc. 
    // OR if we treat it as headerless, we get array of values.
    // Let's inspect how we read it. If we use headers: false.

    const values = Object.values(row);
    if (values.length < 6) {
        console.error(`Invalid row, not enough columns: ${JSON.stringify(row)}`);
        return;
    }

    const filename = values[0];
    const dataValues = values.slice(1, 6).map(v => parseFloat(v));

    if (dataValues.some(isNaN)) {
        console.error(`Invalid data in row for ${filename}: ${JSON.stringify(values)}`);
        return;
    }

    const configuration = {
        type: 'pie' as const,
        data: {
            labels: ['Field 1', 'Field 2', 'Field 3', 'Field 4', 'Field 5'],
            datasets: [{
                data: dataValues,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                ],
                borderWidth: 1
            }]
        },
        options: {
            plugins: {
                legend: {
                    display: true
                },
                title: {
                    display: true,
                    text: `Chart for ${filename}`
                }
            }
        }
    };

    const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    const outputPath = path.join(__dirname, '..', `${filename}.png`);
    fs.writeFileSync(outputPath, image);
    console.log(`Saved ${outputPath}`);
};

const results: ChartRow[] = [];

fs.createReadStream('charts.csv')
    .pipe(csv({ headers: false }))
    .on('data', (data) => results.push(data))
    .on('end', async () => {
        for (const row of results) {
            await processRow(row);
        }
    });
