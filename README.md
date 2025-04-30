3 LEG OAuth
trust exchange framework that involve three entity
the resource owner called user 
the api where all resources live and third party application that interact with users resources

todoist api allows users to create personal todolist
api will interact within individual users todolist- create new task
the permission can only be granted when the user is directly communicating with the api
http only support two entitys
external application should not prompting the user for their account credential as this becomes a major sercurity hazard


server.on("listening", listen_handler);
server.listen(port);
function listen_handler(){
	console.log(`Now Listening on Port ${port}`);
	console.log(server.address());
}

server.on("request", request_handler);
function request_handler(req, res){
    console.log(`New Request from ${req.socket.remoteAddress} for ${req.url}`);
    if(req.url === "/"){
        const form = fs.createReadStream("html/index.html");
		res.writeHead(200, {"Content-Type": "text/html"})
		form.pipe(res);
    }
    else if (req.url.startsWith("/add_task")){
		let user_input = url.parse(req.url, true).query;
		if(user_input === null){
			not_found(res);
		}
		const {task} = user_input;
		const state = crypto.randomBytes(20).toString("hex");
		task_states.push({task, state});
		redirect_to_todoist(state, res);
	}
	else if(req.url.startsWith("/receive_code")){
		const {code, state} = url.parse(req.url, true).query;
		console.log(code);
		let task_state = task_states.find(task_state => task_state.state === state);
        if(code === undefined || state === undefined || task_state === undefined){
			not_found(res);
			return;
		}
		const {task} = task_state;
		send_access_token_request(code, task, res);
	}
    else{
		not_found(res);
    }
}

function not_found(res){
	res.writeHead(404, {"Content-Type": "text/html"});
	res.end(`<h1>404 Not Found</h1>`);
}

function redirect_to_todoist(state, res){
	const authorization_endpoint = "https://todoist.com/oauth/authorize";
	console.log({client_id, scope, state});
    let uri = querystring.stringify({client_id, scope, state});
	res.writeHead(302, {Location: `${authorization_endpoint}?${uri}`})
	   .end();
}

function send_access_token_request(code, task, res){
	const token_endpoint = "https://todoist.com/oauth/access_token";
	const post_data = querystring.stringify({client_id, client_secret, code});
	console.log(post_data);
	let options = {
		method: "POST",
		headers:{
			"Content-Type":"application/x-www-form-urlencoded"
		}
	}
	https.request(
		token_endpoint, 
		options, 
		(token_stream) => process_stream(token_stream, receive_access_token, task, res)
	).end(post_data);
}

function process_stream (stream, callback , ...args){
	let body = "";
	stream.on("data", chunk => body += chunk);
	stream.on("end", () => callback(body, ...args));
}

function receive_access_token(body, task, res){
	const {access_token} = JSON.parse(body);
	send_add_task_request(task, access_token, res);
}

function send_add_task_request(task, access_token, res){
	const task_endpoint = "https://api.todoist.com/rest/v2/tasks";
	const post_data = JSON.stringify({"content":task});
	const options = {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${access_token}`
		}
	}
	https.request(
		task_endpoint, 
		options, 
		(task_stream) => process_stream(task_stream, receive_task_response, res)
	).end(post_data);
}

function receive_task_response(body, res){
	const results = JSON.parse(body);
	console.log(results);
	res.writeHead(302, {Location: `${results.url}`})
	   .end();
}

3leg
built on top level of transport layer security or TLS protocol
this allow us application level developer to minimize our exposure to writing our security
oauth 2 there are two models client credential which does not include the involvement of user resources
example the modified album art project

other one is 3LEG model is used when we want to interact with resources that are user specific

resources are generic term for a particular users personal data in relational to the API
spotify resource is playlist 
looking track details adding new tracks remove track
explicitly granted application permission in the 


json result is the web interchange format
translate json to object
allow different servers and clients to communicate
to transfer data each other without knowing the specific language that client or server is using


LinedIn API Meowfacts Mashup


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
