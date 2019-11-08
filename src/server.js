const Az = require('az');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const config = require('./config');

const app = express();

app.use(cors());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Ok',
    config
  });
});

app.post('/parse', (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.json({
      message: 'You didnt provide text'
    })
  }

  const tokens = Az.Tokens(text).done();

  const words = tokens.map(token => {
    const type = String(token.type);
    const subType = String(token.subType);
    if (type === 'WORD') {
      return {
        word: token.source.substring(token.st, token.st + token.length),
        subType,
        type,
      }
    }
  }).filter(Boolean);

  const result = words.map(({word}) => {

    const variants = Az.Morph(word, {typos: 'auto'});

    const forstVariant = variants[0];
    const normalized = forstVariant.normalize(true).word;

    return {
      normalized,
      tag: String(forstVariant.tag.POST)
    };
  });


  const nouns = result.filter(({tag}) => {
    return tag === 'NOUN';
  });

  const verbs = result.filter(({tag}) => {
    return tag === 'VERB';
  });

  const adjectives = result.filter(({tag}) => {
    return tag === 'ADJF';
  });


  const finalResult = {
    text,
    result,
    nouns,
    verbs,
    adjectives
  };

  console.log(tokens);
  console.log(words);
  console.log(result.toString());

  res.json({
    finalResult
  })

});

app.get('*', (req, res) => {
  res.status(404).json({
    message: 'Page not found'
  });
});


Az.Morph.init('node_modules/az/dicts', function (error) {
  if (error) {
    console.error(`Error loading dictionary`);
  } else {
    console.log(`Dictionary loaded`);
  }
});


app.listen(config.PORT, () => {

  let interval;

  const registerUrl = `${config.SERVICE_DISCOVERY_URL}/service/register/${config.SERVICE_NAME}/${config.SERVICE_VERSION}/${config.PORT}`;
  const deregisterUrl = `${config.SERVICE_DISCOVERY_URL}/service/register/${config.SERVICE_NAME}/${config.SERVICE_VERSION}/${config.PORT}`;

  const registerService = () => axios.put(registerUrl);
  const deregisterService = () => axios.delete(deregisterUrl);

  registerService()
    .then((response) => {
      const timeToMakeRequest = response && response.data && response.data.timeout;
      interval = setInterval(registerService, timeToMakeRequest / 3);
    })
    .catch(error => {
      // console.log(`Unable to register service on ${registerUrl}`, error);
      console.log(`Unable to register service on ${registerUrl}`);
    });

  const cleanup = () => {
    if (interval) {
      clearInterval(interval);
    }
    deregisterService();
  };


  process
    .on('SIGINT', () => {
      console.log('Close with SIGINT');
      cleanup();
      process.exit(0);
    })
    .on('SIGTERM', () => {
      console.log('Close with SIGTERM');
      cleanup();
      process.exit(0);
    })
    .on('unhandledRejection', (reason, p) => {
      // console.error(reason, 'Unhandled Rejection at Promise', p);
      console.error('Unhandled Rejection at Promise');
      cleanup();
      process.exit(1);
    })
    .on('uncaughtException', (error) => {
      // console.log(`uncaughtException`,error);
      console.log(`uncaughtException`);
      cleanup();
      process.exit(1);
    });

  console.log(
  `Wording service listens on port ${config.PORT}. Process pid: ${process.pid}.
    Config file: 
      PORT: ${config.PORT}
      SERVICE_NAME: ${config.SERVICE_NAME}
      SERVICE_DISCOVERY_URL: ${config.SERVICE_DISCOVERY_URL}
      SERVICE_VERSION: ${config.SERVICE_VERSION}
      NODE_ENV: ${config.NODE_ENV}
  `)
});
