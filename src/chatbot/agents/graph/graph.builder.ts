import { Injectable, OnModuleInit } from '@nestjs/common';
import { BaseMessage } from "@langchain/core/messages";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { CALL_MODEL, SELECT_TOOLS, TOOLS } from "./consts"
import { Annotation, StateGraph, START, END, messagesStateReducer } from "@langchain/langgraph";
import { VectorToolsService } from '../../tools/tools.service';
import { MemoryService } from '../../memory/memory.service'
import { ModelCallService } from './nodes/call.model.service'


export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  documents: Annotation<string[]>(),
  selected_tools: Annotation<string[]>()
});


@Injectable()
export class GraphBuilderService implements OnModuleInit {
  private graph: any;

  constructor(
    private readonly vectorToolsService: VectorToolsService,
    private readonly memoryService: MemoryService,
    private readonly modelCallService: ModelCallService

  ){}

  async onModuleInit() {
    // Build graph after module initialization
    this.graph = await this.buildGraph();
  }

  // Bind selectTool to class instance
  private selectTool = async (
    state: typeof StateAnnotation.State
  ): Promise<{ selected_tools: string[] }> => {
    // Get the last message content
    const lastMessage = state.messages[state.messages.length - 1];
    const query = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);
    // Get tool vector store
    const toolVectorStore = this.vectorToolsService.getToolVectorStore();
    // Search for relevant tools
    const toolDocuments = await toolVectorStore.similaritySearch(query, 5);
    // Extract tool name from metadata
    const documentName = toolDocuments.map(doc => doc.metadata.name);

    console.log(`Selected tools for query "${query}":`, documentName);

    return { selected_tools: documentName };
  };

  private async buildGraph() {

    const toolRegistry = this.vectorToolsService.getToolRegistry();
    // console.log(toolRegistry)
    const tools = Array.from(toolRegistry.values());
    // console.log(tools)
    const toolNode = new ToolNode(tools);
    const graph = new StateGraph(StateAnnotation)
    .addNode(SELECT_TOOLS, this.selectTool)
    .addNode(TOOLS, toolNode)
    .addNode(CALL_MODEL, this.modelCallService.callModel.bind(this.modelCallService))

    .addEdge(START, SELECT_TOOLS)
    .addEdge(SELECT_TOOLS, CALL_MODEL)
    .addConditionalEdges(CALL_MODEL, toolsCondition,
      {
        tools:TOOLS,
        __end__: END
      }
    )
    .addEdge(TOOLS, CALL_MODEL)
    .compile({
      checkpointer: this.memoryService.getCheckpointer(),
      store: this.memoryService.getStore(),
    });
    return graph
  }

  getGraph() {
    if (!this.graph) {
      throw new Error('Graph not initialized. Wait for module initialization.');
    }
    return this.graph;
  }
}











