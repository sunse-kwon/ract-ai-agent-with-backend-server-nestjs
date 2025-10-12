import { Controller, Req, Body, Post } from '@nestjs/common';
import { AgentsService } from './agents.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('chat')
  async chat(@Req() req, @Body() body: { input : string}): Promise<any> {
    return await this.agentsService.agent(req.user.id, body)
  }
}
