"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const openai_1 = require("@langchain/openai");
const appAgent_1 = require("./agents/appAgent");
const cors_1 = __importDefault(require("cors"));
const systemPrompt_1 = require("./utils/systemPrompt");
const model = new openai_1.ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.7
});
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)());
const port = process.env.PORT || 3000;
let history = [];
app.post("/stream", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    try {
        const { input, address } = req.body;
        const appInstance = yield (0, appAgent_1.appAgent)(model);
        let appName = "";
        let projectId = "";
        const getSystemPromt = () => {
            return [
                {
                    role: "system", content: (0, systemPrompt_1.systemPrompt)(address, appName, projectId)
                }, {
                    role: "system", content: "History: " + JSON.stringify(history)
                }
            ];
        };
        const stream = yield appInstance.stream({
            messages: [
                ...getSystemPromt(),
                { role: "user", content: input }
            ],
        }, {
            streamMode: "values"
        });
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Transfer-Encoding', 'chunked');
        try {
            for (var _d = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield stream_1.next(), _a = stream_1_1.done, !_a; _d = true) {
                _c = stream_1_1.value;
                _d = false;
                const chunk = _c;
                const lastMessage = chunk.messages[chunk.messages.length - 1];
                const type = lastMessage._getType();
                const content = lastMessage.content;
                const toolCalls = lastMessage.tool_calls;
                const data = JSON.stringify({
                    type,
                    content,
                    toolCalls
                });
                history.push(JSON.stringify(content));
                res.write(data + "\n");
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = stream_1.return)) yield _b.call(stream_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        res.end();
    }
    catch (error) {
        console.error("Error in /stream endpoint:", error);
        res.status(500).send("Internal Server Error");
    }
}));
app.get("/clearHistory", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    history = [];
    res.status(200).send("History cleared");
}));
// async function main() {
//     const appDetails = await getAppDetails("518", "ethlite");
//     console.log(appDetails);
// }
// main();
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
