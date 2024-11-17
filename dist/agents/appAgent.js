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
Object.defineProperty(exports, "__esModule", { value: true });
exports.appAgent = void 0;
const prebuilt_1 = require("@langchain/langgraph/prebuilt");
const langgraph_1 = require("@langchain/langgraph");
const apps_1 = require("../agent_tools/apps");
const nfts_1 = require("../agent_tools/nfts");
const appAgent = (model) => __awaiter(void 0, void 0, void 0, function* () {
    const tools = [
        apps_1.getAppsTool,
        nfts_1.getProjectTool,
        nfts_1.getTotalProjectsTool,
        nfts_1.mintProjectTool,
        apps_1.createAppTool,
        nfts_1.transferProjectTool,
        apps_1.getAppDetailsTool,
        apps_1.getAppIdTool,
        apps_1.updateAppTool,
        apps_1.deleteAppTool,
        nfts_1.getBalanceOfProjectTool,
        nfts_1.addBalanceToProjectTool,
        apps_1.getDeploymentStatusTool,
        nfts_1.grantRoleToProjectTool,
        nfts_1.revokeRoleFromProjectTool,
        apps_1.estimateBalanceTool,
        apps_1.estimateBalanceForCreateAppTool
    ];
    // withdraw balance, delete nft, update nft metadata
    // add session history to firebase
    // ai model should use access point from openai
    // claud access point need to be made
    const toolNodeForGraph = new prebuilt_1.ToolNode(tools);
    const modelWithTools = model.bindTools(tools);
    const shouldContinue = (state) => {
        var _a;
        const { messages } = state;
        const lastMessage = messages[messages.length - 1];
        if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && ((_a = lastMessage.tool_calls) === null || _a === void 0 ? void 0 : _a.length)) {
            return "tools";
        }
        return langgraph_1.END;
    };
    const callModel = (state) => __awaiter(void 0, void 0, void 0, function* () {
        const { messages } = state;
        const response = yield modelWithTools.invoke(messages);
        return { messages: response };
    });
    const workflow = new langgraph_1.StateGraph(langgraph_1.MessagesAnnotation)
        // Define the two nodes we will cycle between
        .addNode("agent", callModel)
        .addNode("tools", toolNodeForGraph)
        .addEdge(langgraph_1.START, "agent")
        .addConditionalEdges("agent", shouldContinue, ["tools", langgraph_1.END])
        .addEdge("tools", "agent");
    const app = workflow.compile();
    return app;
});
exports.appAgent = appAgent;
