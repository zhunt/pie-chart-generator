import { Chart, registerables } from 'chart.js';
import { createCanvas } from 'canvas';

Chart.register(...registerables);

const width = 800;
const height = 600;

// Minimal hacks to make Chart.js work in Node without JSDOM
// @ts-ignore
global.CanvasGradient = function () { };
// @ts-ignore
global.CanvasPattern = function () { };

const run = async () => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const config: any = {
        type: 'pie',
        data: {
            labels: ['A', 'B'],
            datasets: [{ data: [10, 20], backgroundColor: ['red', 'blue'] }]
        },
        options: {
            responsive: false,
            animation: false,
            // Disable events to avoid DOM listeners
            events: []
        },
        plugins: [{
            id: 'background',
            beforeDraw: (chart: any) => {
                const ctx = chart.ctx;
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
            }
        }]
    };

    // Chart.js checks for HTMLCanvasElement. 
    // We might need to trick it or use a custom platform if this fails.
    try {
        // @ts-ignore
        new Chart(ctx as any, config);

        const buffer = canvas.toBuffer('image/png');
        if (buffer.length > 1000) {
            console.log('Success: Buffer generated, size ' + buffer.length);
        } else {
            console.log('Fail: Buffer too small');
        }
    } catch (e) {
        console.error('Error:', e);
    }
};

run();
