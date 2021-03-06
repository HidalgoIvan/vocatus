/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk');
const dbHelper = require('./helpers/dbHelper');
const GENERAL_REPROMPT = "What would you like to do?";
const dynamoDBTableName = "vocatus-names";
const dynamoDBSongTable = "vocatus-songs";
var playerScore = {};
async function getRandomQuestion(handlerInput)
{
  var speechText = ""
  const { requestEnvelope, attributesManager } = handlerInput;
  const sessionAttributes = attributesManager.getSessionAttributes();
  var questionId = Math.floor(Math.random() * 10) + 1;
  return dbHelper.getQuestions(questionId)
      .then((data) => {
        var question = data.map(e => e.text)
        speechText += data[0].text;
        speechText += " " + data[0].options;
        Object.assign(sessionAttributes, {
        correctAnswer: data[0].correctAnswer
      });
        return speechText;
    }
  )
}
async function getRandomSongQuestion(handlerInput)
{
  var speechText = ""
  const { requestEnvelope, attributesManager } = handlerInput;
  const sessionAttributes = attributesManager.getSessionAttributes();
  var songId = Math.floor(Math.random() * 10) + 1;
  return dbHelper.getSongQuestions(songId)
      .then((data) => {
        var question = data.map(e => e.text)
        // speechText += data[0].text;
        speechText += `Escucha la siguiente canción: <break time="1s"/> <audio src="${data[0].url}" />`;
        speechText += `¿Cuál es el nombre de la canción?<break time="1s"/>${data[0].options}`
        speechText += " " + data[0].options;
        Object.assign(sessionAttributes, {
        correctAnswer: data[0].correctAnswer,
      });
        return speechText;
    }
  )
}

async function getRandomName(handlerInput, userID)
{
  var speechText = ""
  const { requestEnvelope, attributesManager } = handlerInput;
  const sessionAttributes = attributesManager.getSessionAttributes();
   return dbHelper.getNames(userID)
      .then((data) => {
        if (data.length == 0) {
          speechText = "Aún no has guardado ningún nombre."
        } else {
          var nameArray = data.map(e => e.playerName).join(",").split(",");
          speechText = nameArray[Math.floor(Math.random()*nameArray.length)];
        }
        return speechText
      })
}
async function getAllNames(handlerInput, userID)
{
  var names = "";
  return dbHelper.getNames(userID)
      .then((data) => {
          names += data.map(e => e.playerName).join(", ")
        return names
      })
}
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const speechText = '<p>Hola, soy Vocatus, tu skill para las pedas y poner el ambiente.</p> <p>Puedes empezar preguntándome ¿Cómo se juega?</p>';
    const repromptText = 'Dime un nombre';
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    console.log(typeof getAllNames(handlerInput, userID));
    var names =(await (getAllNames(handlerInput, userID)) + "").split(",");
    var aux = "";
    for(var x = 0; x < names.length; x++)
    {
      var name = names[x];
      playerScore[""+name] = 0;
    }
    const { requestEnvelope, attributesManager } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    Object.assign(sessionAttributes, {
        score : playerScore
    });
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(repromptText)
      .getResponse();
  },
};
const StartTriviaIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'StartTrivia';
  },
  async handle(handlerInput) {
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    var names = await getAllNames(handlerInput, userID);
    var speechText =""
    if(names != null or names != ""){
      speechText = "Prepárense " + names + " para un juego en el que se les harán varias\
      preguntas y ustedes deberán contestar tan bien como puedan para evitar salir en coma etílico.";
    }else{
      var speechText = "No tienes jugadores registrados. ";
      speechText += '<p>Dime a quiénenes agrego.</p><p> Di: "Agrega a" y di el nombre del jugador que se unirá al juego.</p>';
    }
    var response = responseBuilder
      .speak(speechText)
      .getResponse();
    response.shouldEndSession = false;
    return response;
  }
};
const SaveNameIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'SaveName';
  },
  async handle(handlerInput) {
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const name = slots.Name.value;
    console.log("NAMES:" + slots.Name);
    console.log("NAME VALUES: " + slots.Name.value);
    console.log("SLOTS:" + slots);
    return dbHelper.addName(name, userID)
      .then((data) => {
        const speechText = `Acabas de añadir a ${name}.`;
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        console.log("Error occured while saving movie", err);
        const speechText = "Error de base de datos, no se guardó el nombre"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })
  },
};
const GetScoreIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetScore';
  },
  async handle(handlerInput) {
    const { requestEnvelope, attributesManager, responseBuilder } = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    var scores = sessionAttributes['score']
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    var speechText = "";
    for(var key in scores){
      speechText += `<p> ${key} tiene un puntaje de ${scores[key]} puntos.</p>`
    }
    return responseBuilder
      .speak(speechText)
      .reprompt(GENERAL_REPROMPT)
      .getResponse();
  }
}
const TellNameIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'TellName';
  },
  async handle(handlerInput) {
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    return dbHelper.getNames(userID)
      .then((data) => {
        var speechText = "<p>Los nombres que has guardado son: </p> "
        if (data.length == 0) {
          speechText = "<p>Aún no has guardado ningún nombre</p>"
        } else {
          speechText += data.map(e => e.playerName).join(", ")
        }
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        const speechText = "Error al acceder a los nombres en la base de datos"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })
  }
}
const HandleGuessIntentHandler = {

  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'HandleGuess';
  },
  async handle(handlerInput) {
    var correctAnswer = "";
    const { responseBuilder } = handlerInput;
    var speechText = "";
    try{
    const { requestEnvelope, attributesManager } = handlerInput;

    const request = handlerInput.requestEnvelope.request;
    let guess = request.intent.slots.Answer.value;
    const sessionAttributes = attributesManager.getSessionAttributes();
    correctAnswer = sessionAttributes['correctAnswer'];
      if(guess.includes(correctAnswer.toLowerCase()))//Respuesta correcta
      {
        var playerScores = sessionAttributes['score'];
        var playerName = sessionAttributes['currentPlayer'];
        playerScores[playerName] = playerScores[playerName] + 1;
        Object.assign(sessionAttributes, {
            score : playerScores
        });
        speechText = `<speak>¿${guess}?, La respuesta es...<break time="1s"/><audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_positive_response_02'/>¡Correcta!<audio src="soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_positive_response_03"/></speak>`;
      }else{
        var seconds = Math.floor(Math.random()*15) + 2;
        var alcohols = ["cerveza", "sube a la más chaparra a la mesa","vodka","tequila","una cubita", "un whiskito", "nesquick por la nariz", "tonayan", "besar al de al lado", "darle de tomar al de al lado", "fourloko", "kosaco", "aguas locas", "la bebida del de al lado", "el vaso más lleno", "lamerle el pie a la más chaparra","gemir"];
        var drink = alcohols[Math.floor(Math.random()*alcohols.length)];
        speechText = `<speak>¿${guess}?, La respuesta es...<break time="1s"/><audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_negative_response_01'/>¡Incorrecta!<audio src='soundbank://soundlibrary/human/amzn_sfx_crowd_boo_03'/>${seconds} segundos de ${drink}</speak>`;
      }
    }
    catch(err)
    {
      console.log("ERROR AYUDA RESPUESTAS AHH : " + err);
    }
        var response = responseBuilder
          .speak(speechText)
          .getResponse();
        response.shouldEndSession = false;
        return response;
    }
}
const AddPointIntentHandler = {

  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AddPoint';
  },
  async handle(handlerInput) {
    const { responseBuilder } = handlerInput;
    var speechText = "";
    const { requestEnvelope, attributesManager } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    var allNames = "";
    const request = handlerInput.requestEnvelope.request;
    return dbHelper.getNames(userID)
      .then((data) => {
        if (data.length == 0) {
          speechText = "Aún no has guardado a ningún jugador"
        } else {
          allNames = data.map(e => e.playerName).join(", ");
        }
        let playerName = request.intent.slots.player.value
        if(allNames.toLowerCase().includes(playerName.toLowerCase()))
        {
          const { requestEnvelope, attributesManager } = handlerInput;
          const sessionAttributes = attributesManager.getSessionAttributes();
          var playerScores = sessionAttributes['score'];
          playerScores[playerName] = playerScores[playerName] + 1;
          Object.assign(sessionAttributes, {
              score : playerScores
          });
          speechText = "Punto para " + playerName;
        }else{
          speechText = "No tengo registrado a ningún " + playerName;
        }
        var response = responseBuilder
          .speak(speechText)
          .getResponse();
        response.shouldEndSession = false;
        return response;
      })
      .catch((err) => {
        console.log(err);
        speechText = "Error al acceder a los nombres en la base de datos"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })
    }
}
const RemovePointIntentHandler = {

  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'RemovePoint';
  },
  async handle(handlerInput) {
    const { responseBuilder } = handlerInput;
    var speechText = "";
    const { requestEnvelope, attributesManager } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    var allNames = "";
    const request = handlerInput.requestEnvelope.request;
    return dbHelper.getNames(userID)
      .then((data) => {
        if (data.length == 0) {
          speechText = "Aún no has guardado a ningún jugador"
        } else {
          allNames = data.map(e => e.playerName).join(", ");
        }
        let playerName = request.intent.slots.player.value
        if(allNames.toLowerCase().includes(playerName.toLowerCase()))
        {
          const { requestEnvelope, attributesManager } = handlerInput;
          const sessionAttributes = attributesManager.getSessionAttributes();
          var playerScores = sessionAttributes['score'];
          playerScores[playerName] = playerScores[playerName] + 1;
          Object.assign(sessionAttributes, {
              score : playerScores
          });
          speechText = playerName + " menos un punto, carnal.";
        }else{
          speechText = "No tengo registrado a ningún " + playerName;
        }
        var response = responseBuilder
          .speak(speechText)
          .getResponse();
        response.shouldEndSession = false;
        return response;
      })
      .catch((err) => {
        console.log(err);
        speechText = "Error al acceder a los nombres en la base de datos"
        return responseBuilder
          .speak(speechText)
          .getResponse();
      })
    }
}
const GetQuestionIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GetQuestion';
  },
  async handle(handlerInput) {
    var choice = Math.floor(Math.random() * 3);
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    var playerName = await getRandomName(handlerInput, userID);
    if(choice == 0 || choice == 1)
    {
      const { requestEnvelope, attributesManager } = handlerInput;
      const sessionAttributes = attributesManager.getSessionAttributes();
      switch (choice) {
        case 0:
          var questionText = await getRandomQuestion(handlerInput);
          break;
        case 1:
          var questionText = await getRandomSongQuestion(handlerInput);
          break;

      }
      var speechText = playerName + ", " + questionText;
      Object.assign(sessionAttributes, {
      currentPlayer: playerName
      });
      var response = responseBuilder
        .speak(speechText)
        .getResponse();
      response.shouldEndSession = false;
      return response;
    }
    else{
      var themes = ["acuarios","pintura","canotaje","música clasica","dietas","mascotas", "tec de monterrey"];
      var speechText = "<speak><p> " + playerName + ", tienes 5 segundos para decir 5 cosas relacionadas con el tema de " + themes[Math.floor(Math.random()*themes.length)] + " empezando ahora </p>";
      for(var x = 1; x <= 4; x++){
        speechText+="<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_player1_01'/><break time='1s'/>";
      }
      speechText+="<audio src='soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_player1_01'/>";
      speechText += "¡Se acabó el tiempo!</speak>";
      var response = responseBuilder
        .speak(speechText)
        .getResponse();
      response.shouldEndSession = false;
      return response;
    }
  }
}
const RemoveNameIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'RemoveName';
  },
  handle(handlerInput) {
    const {responseBuilder } = handlerInput;
    const userID = handlerInput.requestEnvelope.context.System.user.userId;
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const name = slots.Name.value;
    return dbHelper.removeName(name, userID)
      .then((data) => {
        const speechText = `Has borrado a ${name} del juego, qué mala onda`
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
      .catch((err) => {
        console.log(err);
        const speechText = `No hay ningún jugador llamado ${name} actualmente`
        return responseBuilder
          .speak(speechText)
          .reprompt(GENERAL_REPROMPT)
          .getResponse();
      })
  }
}

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speechText = 'Puedes decir: "siguiente pregunta", para pasar a la siguiente pregunta. "Agrega a Norbi", para agregar al jugador de nombre Norbi. "Eliminia a Norbi", para eliminar al jugador de nombre norbi. "Súmale un punto a" o "Réstale un punto a", para modificar el score de un jugador en específico.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const InstruccionesIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'Instrucciones';
  },
  handle(handlerInput) {
    var speechText = '<p> Di "empezar juego", para iniciar a jugar.</p><p>Di "siguiente pregunta", para pasar a la siguiente pregunta.</p>';
    speechText += '<p> Di "agrega a Norbi" o "elimina a Norbi", para eliminar o agregar al jugador de nombre Norbi.</p>'
    speechText += '<p> El juego consiste de 3 tipos de preguntas: de opción múltiple, adivina la canción y temas por tiempo.</p>'
    speechText += '<p> Opción múltiple: <break strength="strong"/> se te dirá una pregunta de opción múltiple y tendrás que contestar la respuesta correcta.</p>';
    speechText += '<p> Adivina la canción: <break strength="strong"/> se reproducirá una canción y tendrás que contestar la respuesta correcta.</p>';
    speechText += '<p> Tema por tiempo: <break strength="strong"/> se te dirá un tema y tendrás que decir una cantidad de palabras relacionadas que se te indique.</p>';

    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .getResponse();
  },
};

const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speechText = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    SaveNameIntentHandler,
    TellNameIntentHandler,
    GetQuestionIntentHandler,
    StartTriviaIntentHandler,
    HandleGuessIntentHandler,
    RemoveNameIntentHandler,
    AddPointIntentHandler,
    RemovePointHandler,
    HelpIntentHandler,
    GetScoreIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withTableName(dynamoDBTableName)
  .withAutoCreateTable(true)
  .withTableName('vocatus-questions')
  .withAutoCreateTable(true)
  .lambda();
