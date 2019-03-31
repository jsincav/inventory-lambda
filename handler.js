'use strict';

require('dotenv').config();
const AWS = require('aws-sdk');
let dynamo = new AWS.DynamoDB.DocumentClient();

require('aws-sdk/clients/apigatewaymanagementapi');

const INVENTORYCONNECTION_TABLE = 'inventoryIdTable';

const successfullResponse = {
	statusCode: 200,
	body: 'everything is alright'
};

module.exports.connectionHandler = (event, context, callback) => {
	console.log(event);

	if (event.requestContext.eventType === 'CONNECT') {
		// Handle connection
		addConnection(event.requestContext.connectionId)
			.then(() => {
				callback(null, successfullResponse);
			})
			.catch((err) => {
				console.log('error: ' + err);
				callback(null, JSON.stringify(err));
			});
	} else if (event.requestContext.eventType === 'DISCONNECT') {
		// Handle disconnection
		deleteConnection(event.requestContext.connectionId)
			.then(() => {
				callback(null, successfullResponse);
			})
			.catch((err) => {
				console.log(err);
				callback(null, {
					statusCode: 500,
					body: 'Failed to connect: ' + JSON.stringify(err)
				});
			});
	}
};

// THIS ONE DOESNT DO ANYHTING
module.exports.defaultHandler = (event, context, callback) => {
	console.log('defaultHandler was called');
	console.log(event);

	callback(null, {
		statusCode: 200,
		body: 'defaultHandler'
	});
};

module.exports.getInventoryHandler = (event, context, callback) => {
	console.log(event);
	const { pool } = require('./db');
	pool.connect((err, client, release) => {
		if (err) {
			pool.end().then(() => {
				callback(null, JSON.stringify(err));
			});
		}
		client.query('select * from devices', (err, result) => {
			release();
			pool.end().then(() => {
				if (err) {
					callback(null, JSON.stringify(err));
				}
				send(event, event.requestContext.connectionId, JSON.stringify(result))
					.then(() => {
						callback(null, successfullResponse);
					})
					.catch((err) => {
						console.log('send error: ' + err);
						callback(null, JSON.stringify(err));
					});
			});
		});
	});
};

module.exports.addItemHandler = (event, context, callback) => {
	console.log(event);
	console.log('data: ' + JSON.parse(event.body).data);
	// {
	// 	"eventType": "addItem",
	// 	"data": {
	// 		"id": 4,
	// 		"device": "TouchTalk 4",
	// 		"serial": "45345",
	// 		"date": "12/25/2020"
	// 	}
	// }
	//const { client } = require('./db');

	// client
	// 	.query(`INSERT INTO public.devices(device_type, serial, date) VALUES('TouchTalk', 't57876', '01/26/2018')`)
	// 	.then((result) => {
	// 		client.end();
	// 		addItemToAllConnected(event)
	// 			.then(() => {
	// 				callback(null, successfullResponse);
	// 			})
	// 			.catch((err) => {
	// 				callback(null, JSON.stringify(err));
	// 			});
	// 	})
	// 	.catch((err) => {
	// 		client.end();
	// 		console.log('error: ' + err);
	// 		callback(null, JSON.stringify(err));
	// 	});

	addItemToAllConnected(event)
		.then(() => {
			callback(null, successfullResponse);
		})
		.catch((err) => {
			callback(null, JSON.stringify(err));
		});
};

const addItemToAllConnected = (event) => {
	return getConnectionIds().then((connectionData) => {
		return connectionData.Items.map((connectionId) => {
			return send(event, connectionId.connectionId, JSON.parse(event.body).data);
		});
	});
};

const getConnectionIds = () => {
	const params = {
		TableName: INVENTORYCONNECTION_TABLE,
		ProjectionExpression: 'connectionId'
	};

	return dynamo.scan(params).promise();
};

const send = (event, connectionId, data) => {
	const endpoint = event.requestContext.domainName + '/' + event.requestContext.stage;
	const apigwManagementApi = new AWS.ApiGatewayManagementApi({
		apiVersion: '2018-11-29',
		endpoint: endpoint
	});

	const action = JSON.parse(event.body).action;
	var Data = {
		action,
		data
	};
	Data = JSON.stringify(Data);

	const params = {
		ConnectionId: connectionId,
		Data
	};
	return apigwManagementApi.postToConnection(params).promise();
};

const addConnection = (connectionId) => {
	const params = {
		TableName: INVENTORYCONNECTION_TABLE,
		Item: {
			connectionId: connectionId
		}
	};

	return dynamo.put(params).promise();
};

const deleteConnection = (connectionId) => {
	const params = {
		TableName: INVENTORYCONNECTION_TABLE,
		Key: {
			connectionId: connectionId
		}
	};

	return dynamo.delete(params).promise();
};
