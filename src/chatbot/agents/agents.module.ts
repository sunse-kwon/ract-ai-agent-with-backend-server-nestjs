import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { ModelCallService } from './graph/nodes/call.model.service'
import { AgentsController } from './agents.controller';
import { ToolsModule } from '../tools/tools.module'
import { MemoryModule } from '../memory/memory.module'
import { GraphBuilderService } from './graph/graph.builder'


@Module({
  imports: [ToolsModule, MemoryModule],
  controllers: [AgentsController],
  providers: [AgentsService, ModelCallService, GraphBuilderService],
})
export class AgentsModule {}
