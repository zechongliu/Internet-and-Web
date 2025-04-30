const fs = require("fs");
const http = require("http");
const https = require("https");
const crypto = require("crypto");

const {client_id, client_secret, scope, response_type, redirect_uri, grant_type} = require("./auth/credentials.json");
const { log } = require("console");
const { fileURLToPath } = require("url");

const port = 3000;

const all_sessions = [];
const server = http.createServer();

server.on("listening", listen_handler);
server.listen(port);
function listen_handler() {
    console.log(`Now Listening on Port ${port}`);
}

server.on("request", request_handler);
function request_handler(req, res) {
    console.log(`New Request from ${req.socket.remoteAddress} for ${req.url}`);
    if (req.url === "/") {
        const form = fs.createReadStream("html/index.html");
        res.writeHead(200, {"Content-Type": "text/html"});
        form.pipe(res);
    } 
    else if (req.url.startsWith("/toLinkedIn")) {
        const user_input = new URL(req.url, `https://${req.headers.host}`).searchParams;
        const content = user_input.get("content");
        const state = crypto.randomBytes(20).toString("hex");
        all_sessions.push({content, state});
        redirect_to_LinkedIn(state, res);
    } 
    else if (req.url.startsWith("/receive_code")) {
        const user_input = new URL(req.url, `https://${req.headers.host}`).searchParams;
        const code = user_input.get("code");
        const state = user_input.get("state");
        console.log({code, state});
        let session = all_sessions.find((session) => session.state === state);
        if (code === undefined || state === undefined || session === undefined) {
            not_found(res);
            return;
        }
        const {content} = session;
        send_access_token_request(code, content, res);
    } 
    else {
        not_found(res);
    }
}

function not_found(res) {
    res.writeHead(404, {"Content-Type": "text/html"});
    res.end(`<h1>404 Not Found</h1>`);
}

function redirect_to_LinkedIn(state, res) {
    const authorization_endpoint = "https://www.linkedin.com/oauth/v2/authorization";
    let uri = new URLSearchParams({response_type, client_id,redirect_uri,state, scope}).toString();
    console.log({uri});
    res.writeHead(302, {Location: `${authorization_endpoint}?${uri}`}).end();
}

function send_access_token_request(code, content, res) {
    const token_endpoint = "https://www.linkedin.com/oauth/v2/accessToken";
    let post_data = new URLSearchParams({grant_type, client_id, client_secret, code, redirect_uri}).toString();
    console.log(post_data);
    let options = {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    };
    https.request(token_endpoint, options, 
        (token_stream) => process_stream(token_stream, receive_access_token, content, res)
    ).end(post_data);
}

function process_stream(stream, callback, ...args) {
    let body = "";
    stream.on("data", (chunk) => (body += chunk));
    stream.on("end", () => callback(body, ...args));
}

function receive_access_token(body, content, res) {
    const {access_token} = JSON.parse(body);
    console.log({body});
    get_username_information(content, access_token, res);
}

function get_username_information(content, access_token, res) {
    const post_endpoint = "https://api.linkedin.com/v2/me";
    const content_request = https.request(post_endpoint, {method: "GET", headers:{"LinkedIn-Version":"202212", Authorization:`Bearer ${access_token}`}});
    content_request.on("response", (stream) => process_stream(stream, receive_username_results, content, access_token, res));
    content_request.end();
}

function receive_username_results(body, content, access_token, res) {
    const data = JSON.parse(body);
    const id = data?.id;
    const first_name = data?.localizedFirstName;
    const last_name = data?.localizedLastName;
    console.log({data});
    second_api_request(id, first_name, last_name, content, access_token, res);
}

function second_api_request(id, first_name, last_name, content, access_token, res){
    const second_api_endpoint= "https://meowfacts.herokuapp.com/";
    console.log(`GET request sent to ${second_api_endpoint}`);
    const second_api_request = https.request(second_api_endpoint);
    second_api_request.on("response", stream => process_stream(stream, create_post, content, id, first_name, last_name, access_token, res));
    second_api_request.end();



}

function create_post(body, content, id, first_name, last_name, access_token, res) {
    const data = JSON.parse(body);
    const fact = data?.data[0];
 
    const post_endpoint = "https://api.linkedin.com/rest/posts";
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
            "X-Restli-Protocol-Version": "2.0.0",
            "LinkedIn-Version": "202212"
        },
    };
    let post_data = JSON.stringify({
        "author": `urn:li:person:${id}`,
        "commentary":`${content} Fact:${fact}`,
        "lifecycleState": "PUBLISHED",
        "visibility":"PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
          },
        "isReshareDisabledByAuthor": false
        });
    
    https.request(post_endpoint, options, 
            (post_stream) => process_stream(post_stream, receive_post_response, first_name,last_name,access_token, res)
        ).end(post_data);
    }

function receive_post_response(body, first_name, last_name,access_token, res) {
    res.writeHead(302, {Location: `https://www.linkedin.com/in/${first_name}-${last_name}/recent-activity/`}).end();
}