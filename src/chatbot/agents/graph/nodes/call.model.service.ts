import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from "uuid";
import { StateAnnotation } from "../graph.builder"
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { VectorToolsService } from '../../../tools/tools.service'
import { AIMessage } from '@langchain/core/messages';

@Injectable()
export class ModelCallService {
  constructor(private readonly vectorToolsService: VectorToolsService) {}

  async callModel(state: typeof StateAnnotation.State, config: LangGraphRunnableConfig): Promise<{ messages: any }> {
    const store = config.store;
    if (!store) {
      if (!store) {
        throw new Error("store is required when compiling the graph");
      }
    }
    if (!config.configurable?.userId) {
      throw new Error("userId is required in the config");
    }

    const toolRegistry = this.vectorToolsService.getToolRegistry();
    
    const selectedTools = state.selected_tools.map(name => {
      
      const tool = toolRegistry.get(name)
      
      if (!tool) {
        throw new Error()
      }
      return tool
    });

    const namespace = ["memories", String(config.configurable?.userId)];
    const memories = await store.search(namespace, { query: String(state.messages[state.messages.length - 1].content) });

    const memory = memories.map((d) => d.value.data).join("\n");

    const systemMsg = `You are a helpful assistant with memory that provides information about the user. 
      If you have memory for this user, use it to personalize your responses.
      Here is the memory (it may be empty): ${memory}`;

    // Store new memories if the user asks the model to remember
    const lastMessage = state.messages[state.messages.length - 1];

    if (
      typeof lastMessage.content === "string" &&
      lastMessage.content.toLowerCase().includes("remember")
    ) {
      await store.put(namespace, uuidv4(), { data: lastMessage.content });
    }

    const model = new ChatOpenAI({ model: 'gpt-4o-mini', temperature: 0 })
    
    const modelWithTools = model.bindTools(selectedTools)

    const response = await modelWithTools.invoke([
      { type: "system", content: systemMsg },
      ...state.messages,
    ]);

    return { messages: response }
  };
}