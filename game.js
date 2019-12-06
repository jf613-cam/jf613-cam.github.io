let type = "WebGL"
if(!PIXI.utils.isWebGLSupported()){
  type = "canvas"
}

gameWidth = window.innerWidth; gameHeight = window.innerHeight;
var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, this.options);

//Create a Pixi Application
let app = new PIXI.Application({ width: gameWidth, height: gameHeight });
//Add the canvas that Pixi automatically created for you to the HTML document
document.body.appendChild(app.view);
const background = new PIXI.Container();
const foreground = new PIXI.Container();
app.stage.addChild(background);
app.stage.addChild(foreground);

var finishTime;
var gameConnection;
var gameClient;
var timeToShootText;
var finishText;
var deltaTimeShot;
var haveShot = false;
var gameStarted = false;
var readyToStart = true;

initGame();

function initGame() {

	spritesheetname = "images/background/spritesheet.json";
	PIXI.Loader.shared
	  .add(spritesheetname)
	  .load(setup);
	  
	// create a text object with a nice stroke
    timeToShootText = new PIXI.Text('Connecting to server', { font: 'Arial', align: 'center'});

    // setting the anchor point to 0.5 will center align the text... great for spinning!
    timeToShootText.anchor.set(0.5);
    timeToShootText.position.x = gameWidth/2;
    timeToShootText.position.y = gameHeight/2-25;
    foreground.addChild(timeToShootText);
	
	finishText = new PIXI.Text('', { font: 'Arial', align: 'center'});

	// setting the anchor point to 0.5 will center align the text... great for spinning!
	finishText.anchor.set(0.5);
	finishText.position.x = gameWidth/2;
	finishText.position.y = gameHeight/2+25;
	foreground.addChild(finishText);
	
	window.addEventListener("load", start, false);
	app.ticker.add(delta => gameLoop(delta));
}

function gameLoop(delta) {
	if(gameStarted) {
		timeToShootText.text = "Shoot in " + (Math.floor((finishTime - Date.now())/1000) + 1);
	}
    //console.log("Tick!" + delta);
    //console.log(delta);
}

function start() {
	PlayerIO.useSecureApiRequests = true;
	PlayerIO.authenticate(
    'quick-shot-erdmmkjyuko52qcpuaxzfa',    //Game id
    'public',                       //Connection id
    { userId:'testuser' },           //Authentication arguments
    "",            //Optional PlayerInsight segments
    function(client) {
		console.log("Success!");
		playerId = 0;
		client.multiplayer.useSecureConnections = true;
		gameClient = client;
		timeToShootText.text = "Connected, click to start game!";
        //Success!
        //You can now use the client object to make API calls.
		
		//connectToRoom(client);
    },
    function(error) {
        if (error.code == PlayerIOErrorCode.UnknownGame) {
			console.log("Unknown game id used!");
            //Unknown game id used
        } else {
			console.log("Another error!");
			console.log(error);
            //Another error
        }
    }
);
}

function setup() {
  let sheet = PIXI.Loader.shared.resources[spritesheetname].spritesheet;
  backgroundTextures = [sheet.textures["PNG0000.PNG"], sheet.textures["PNG0001.PNG"], sheet.textures["PNG0002.PNG"], sheet.textures["PNG0003.PNG"]];
  decorTextures = [sheet.textures["PNG0004.PNG"], sheet.textures["PNG0005.PNG"], sheet.textures["PNG0006.PNG"], sheet.textures["PNG0007.PNG"], sheet.textures["PNG0008.PNG"], sheet.textures["PNG0009.PNG"], sheet.textures["PNG0010.PNG"], sheet.textures["PNG0011.PNG"]];
  // Create a grid of background
  widthLoops = gameWidth/32;
  heightLoops = gameHeight/32;
    for (let i = 0; i < widthLoops; i++) {
		for( let j = 0; j < heightLoops; j++) {
			const spriteNumber = Math.floor(Math.random() * 4);
			const bgrSprite = new PIXI.Sprite(backgroundTextures[spriteNumber]);
			//bgrSprite.anchor.set(0);
			bgrSprite.x = i * bgrSprite.width;
			bgrSprite.y = j * bgrSprite.height;
			
			bgrSprite.buttonMode = true;
			bgrSprite.interactive = true;
			bgrSprite.on('mousedown', pressedShoot).on('touchstart', pressedShoot)
			
			background.addChild(bgrSprite);
			const decorNumber = Math.floor(Math.random() * 40);
			if(decorNumber < 9 && Math.abs(j - heightLoops / 2) > 3) {
				const decorSprite = new PIXI.Sprite(decorTextures[decorNumber]);
				decorSprite.x = i * bgrSprite.width;
				decorSprite.y = j * bgrSprite.height;
				background.addChild(decorSprite);
			}
		}
    }
}

function connectToLobby(client) {
	finishText.text = "";
	client.multiplayer.createJoinRoom(
		'$service-room$',       //Room id
		'LobbyRoom',        //Room type
		false,                   //Visible
		null,       //Room data
		null,    	//Join data
		function(connection) {
			//Success!
			timeToShootText.text = "Waiting for other player...";
			//Setup a message handler to listen to messages of all types:
			connection.addMessageCallback("*", function(message) {
				//When we receive a message, log it to the console:
				console.log(message);   
				switch(message.type) {
				  case "goto_room":
						roomNumber = message.getInt(0);
						connection.disconnect();
						connectToGameRoom(client, roomNumber);
						break;
					  default:
						// code block
				}
				//Send back a message to the room:
				//connection.send('messagetype','arg1',2,'arg3');
				//Disconnect from the room:
				//connection.disconnect();
			});
			//Setup a disconnect handler:
			connection.addDisconnectCallback(function(){
				console.log("disconnected from lobby");  
			});
		}, 
		function(error) { 
			console.log(error);
		}
	);
}

function connectToGameRoom(client, roomId) {
	client.multiplayer.createJoinRoom(
		'gameRoom' + roomId,       //Room id
		'QuickshotRoom',        //Room type
		true,                   //Visible
		null,       //Room data
		null,    	//Join data
		function(connection) {
			//Success!
			timeToShootText.text = "Starting";
			gameConnection = connection;
			//Setup a message handler to listen to messages of all types:
			connection.addMessageCallback("*", function(message) {
				//When we receive a message, log it to the console:
				console.log(message);   
				switch(message.type) {
				  case "init":
						playerId = message.getInt(0);
						break;
					  case "start":
						timeToShoot = message.getInt(0);
						finishTime = Date.now() + timeToShoot;
						timeToShootText.text = "Shoot in " + Math.floor(timeToShoot/1000);
						gameStarted = true;
						break;
					  case "finish":
						gameStarted = false;
						if(!haveShot) {
							winString = "Your opponent shot before you! You lose!";
						} else {
							winString = " and lost!";
						}
						if(message.getInt(0) == playerId) {
							if(!haveShot) {
								winString = "Your opponent shot too early and you won!";
							} else {
								winString = " and won!";
							}
						}
						// create a text object with a nice stroke
						finishText.text += winString;
						timeToShootText.text = "Click to play again!";
						connection.disconnect();
						// code block
						break;
					  default:
						// code block
				}
				//Send back a message to the room:
				//connection.send('messagetype','arg1',2,'arg3');
				//Disconnect from the room:
				//connection.disconnect();
			});
			//Setup a disconnect handler:
			connection.addDisconnectCallback(function(){
				gameStarted = false;
				haveShot = false;
				readyToStart = true;
				console.log("disconnected from room");
			});
		}, 
		function(error) { 
			readyToStart = true;
			console.log(error);
		}
	);
}

function pressedShoot() {
	if(gameClient === 'undefined') {
		return;
	}
	if(readyToStart) {
		readyToStart = false;
		connectToLobby(gameClient);
		return;
	}
	if (gameStarted) {
		deltaTimeShot = Date.now() - finishTime;
		haveShot = true;
		if(deltaTimeShot >= 0) {
			// Win
			gameConnection.send('shoot', deltaTimeShot);
			finishText.text = "You shot " + deltaTimeShot + "ms late";
		} else {
			// Lose
			gameConnection.send('shoot_early', deltaTimeShot);
			finishText.text = "You shot " + (-deltaTimeShot) + "ms too early";
		}
	}
}