import { Injectable } from '@nestjs/common';
import { GraphBuilderService } from './graph/graph.builder'
import { HumanMessage } from '@langchain/core/messages';

@Injectable()
export class AgentsService {
    constructor(private readonly graphBuilderService :GraphBuilderService) {}

    async agent(id: number, body: any): Promise<any> {
        const config = {"configurable": {"thread_id": "1", "user_id": id}}
        const inputMessages = [new HumanMessage(body.input)]
        const graph = this.graphBuilderService.getGraph()
        return graph.invoke({"messages": inputMessages}, config)
    }
}
