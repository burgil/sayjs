const say = require('say');
const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
app.use(cors({
    origin: '*', // Allows access to all origins! - Insecure - Replace with site url in real world applications - http://example.com
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}));
app.use(express.json());

// app.use('/files', express.static(path.join(__dirname, '../files')));
// app.get('/', function (req, res) {
//     res.sendFile(path.join(__dirname, '../front-end/mp3-complex.html'));
// });

// Route for text-to-speech export
app.post('/tts-export', (req, res) => { // warning unless some unique uuid will be used instead of output.wav as the file name then conflicts will happen in run time - TODO: add tmp folder and UUID as file name and also delete the files after usage - but who the heck will even want to stream it like this?
    const { text, voice } = req.body;
    const filePath = path.join(__dirname, 'output.wav');
    say.export(text, voice, 1, filePath, (err) => {
        if (err) {
            console.error('Error generating speech:', err);
            return res.status(500).json({ error: 'An error occurred while generating speech.' });
        }
        res.set({
            'Content-Type': 'audio/wav',
            'Content-Disposition': 'attachment; filename="speech.wav"'
        });
        res.sendFile(filePath);
    });
});

// Route for text-to-speech streaming - slow
app.post('/tts-stream', async (req, res) => {
    const { text, voice } = req.body;
    try {
        // Stream spoken audio
        const spokenBuffer = await say.stream(text, voice);
        res.write(spokenBuffer,'binary');
        res.end(null, 'binary');
        // Old method that also works but lags the UI for a moment: (Cool way to end uint8Arrays with express.js)
        // const uint8Array = new Uint8Array(spokenBuffer);
        // res.send(uint8Array);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'An error occurred while generating speech.' });
    }
});

let cachedVoices = new Promise(function(resolve, reject) {
    say.getInstalledVoices((err, voices) => {
        if (err) {
            console.error('Error:', { error: err, message: 'An error occurred while retrieving voices.' })
            return reject({ error: err, message: 'An error occurred while retrieving voices.' });
        }
        resolve(voices);
        cachedVoices = voices;
    });
});

app.get('/voices', async function (req, res) {
    res.json(cachedVoices instanceof Promise ? await cachedVoices : cachedVoices);
});

const port = 80;
app.listen(port);
console.log('Server started at http://localhost:' + port);
