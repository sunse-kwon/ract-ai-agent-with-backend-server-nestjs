import { Injectable } from '@nestjs/common';
import { GraphBuilderService } from './graph/graph.builder'
import { HumanMessage } from '@langchain/core/messages';
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class AgentsService {
    constructor(private readonly graphBuilderService :GraphBuilderService) {}

    async agent(id: number, chatDto: ChatDto): Promise<any> {
        const input = chatDto.input
        const sessionId = chatDto.sessionId
        const config: LangGraphRunnableConfig = { configurable: {thread_id: sessionId, userId: id} };

        // const config = {"configurable": {"thread_id": "1", "user_id": id}}
        const inputMessages = [new HumanMessage(input)]
        const graph = this.graphBuilderService.getGraph()
        const response = await graph.invoke({"messages": inputMessages}, config)
        const messages = response.messages || []
        const aiMessages = messages.filter(msg => msg.constructor.name === 'AIMessage');
        const lastAIMessage = aiMessages[aiMessages.length - 1];
        const content = lastAIMessage?.content || '응답 없음';

        return { message: content };
    }
}
