import { Controller, Req, Body, Post } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { ChatDto } from './dto/chat.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('chat')
  async chat(@Req() req, @Body() chatDto: ChatDto): Promise<any> {
    
    return await this.agentsService.agent(req.user.id, chatDto)
  }
}
