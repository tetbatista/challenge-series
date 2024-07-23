import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs, { read, write } from 'fs';
import path from 'path';

const app = express();
const port = 3333;
const dbPath = path.resolve('database.json');

app.use(express.json());

const ensureDatabaseExists = () => {
    return new Promise((resolve, reject) => {
        fs.access(dbPath, fs.constants.F_OK, (err) => {
            if (err) {
                fs.writeFile(dbPath, JSON.stringify([]), (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                    });
                } else {
                    resolve()
                    }
        });
    });
};


const readDatabase = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(dbPath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                try {
                    resolve(JSON.parse(data));
                } catch (parseErr) {
                    reject(parseErr);
                }
            }
        });
    });
};

const writeDatabase = (data) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(dbPath, JSON.stringify(data, null, 2), (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};


let seriesCache = [];
const updateCache = async () => {
    seriesCache = await readDatabase();
};

ensureDatabaseExists().then(() => {
    updateCache().catch(console.error);
}).catch(console.error);


app.get('/series', (req, res) => {
    res.json(seriesCache);
});

app.get('/series/:id', async (req, res) => {
    const serie = seriesCache.find(f => f.id === req.params.id);
    if (serie) {
        res.json(serie);
    } else {
        res.status(400).send('Serie not found');
    }
});

app.get('/series/gender/:gender', async (req, res) => {
    try {
        const gender = req.params.gender;
        if (!gender) {
            return res.status(400).send("Gender not specified")
        }
        console.log('Buscando por genero:', gender)
        const series = seriesCache.filter(serie => serie.gender.toLowerCase() === gender.toLowerCase());
        console.log('Series encontradas', series);
        
        if (series.length === 0) {
            return res.status(404).send('No series found for the specified genre')
        }

        res.json(series);
    } catch (error) {
        res.status(500).send("Error when searching for series")
    }
})


app.post('/series', async (req, res) => {
    try {
        const {name, gender, seasons } = req.body;

        if (!name || !gender || !seasons) {
                return res.status(400).send("Insufficient data provided")
        }
    
        const newSerie = {
            id: uuidv4(),
            name: name,
            gender: gender,
            seasons: seasons,
            liked: false
        };
        seriesCache.push(newSerie);
        
        try {
            await writeDatabase(seriesCache)
            res.status(201).json(newSerie);
        } catch (err) {
        res.status(500).send("Error adding series");
     }
    } catch (err) {
        res.status(500).send('Error processing the request')
    }
});


app.put('/series/:id', async (req, res) => {
    try {
        await updateCache(0);

        const serieIndex = seriesCache.findIndex(f => f.id === req.params.id);
            if (serieIndex !== -1) {
                seriesCache[serieIndex] = {
                    ...seriesCache[serieIndex],
                    ...req.body
                };
                await writeDatabase(seriesCache);
                res.json(seriesCache[serieIndex]);
                } else {
                    res.status(404).send('Serie not found')
                }
            } catch (err) {
                res.status(500).send('Error when updating the series.')
            }
    });


app.delete('/series/:id', async (req, res) => {
    const serieIndex = seriesCache.findIndex( f => f.id === req.params.id);
    if (serieIndex !== -1) {
        seriesCache.splice(serieIndex, 1);
        try {
            await writeDatabase(seriesCache);
            res.status(204).send('Deleted series');
        } catch (err) {
            res.status(500).send('Error writing to database')
        }
    }   else {
            res.status(404).send('Serie not found');
    }
});


fs.access(dbPath, fs.constants.F_OK, (err) => {
    if (err) {
        fs.writeFile(dbPath, JSON.stringify([]), (err) => {
            if (err) console.error('Error creating file database.json', err)
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`)
})