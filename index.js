require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});


const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true }
});

const Url = mongoose.model('Url', urlSchema);

const isValidUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
};

const createShortUrl = async (url) => {
  if (!isValidUrl(url)) {
    throw new Error('invalid url');
  }

  const shortUrl = Math.floor(Math.random() * 10000);
  const newUrl = new Url({ original_url: url, short_url: shortUrl });
  await newUrl.save();
  return shortUrl;
}

const findOriginalUrl = async (shortUrl) => {
  const urlEntry = await Url.findOne({ short_url: shortUrl });
  return urlEntry ? urlEntry.original_url : null;
};

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


app.post('/api/shorturl', (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.json({ error: 'invalid url' });
    }

    if (!isValidUrl(url)) {
      return res.json({ error: 'invalid url' });
    }

    createShortUrl(url)
      .then(shortUrl => {
        res.json({ original_url: url, short_url: shortUrl });
      })
      .catch(err => {
        res.status(500).json({ error: 'Error creating short URL' });
      });
  } catch (error) {
    console.error('Error handling short URL request:', error);
    res.status(500).json({ error: 'Internal Server Error' }); 
  }
});


app.get('/api/shorturl/:short_url', async (req, res) => {
  try {
    const { short_url } = req.params;
    const originalUrl = await findOriginalUrl(short_url);
    if (originalUrl) {
      res.redirect(originalUrl);
    } else {
      res.status(404).json({ error: 'URL not found' });
    }
  } catch (error) {
    console.error('Error handling short URL request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
