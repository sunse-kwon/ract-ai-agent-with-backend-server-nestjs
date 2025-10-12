import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { AgentsModule } from './agents/agents.module';
import { ToolsModule } from './tools/tools.module';
import { MemoryModule } from './memory/memory.module';
import { DatabaseModule } from './database/database.module';

@Module({
  controllers: [ChatbotController],
  providers: [ChatbotService],
  imports: [AgentsModule, ToolsModule, MemoryModule, DatabaseModule],
})
export class ChatbotModule {}
