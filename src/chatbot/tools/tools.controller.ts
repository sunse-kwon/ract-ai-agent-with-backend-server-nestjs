import { Controller } from '@nestjs/common';
import { VectorToolsService } from './tools.service';

@Controller('tools')
export class ToolsController {
  constructor(private readonly vectorToolsService: VectorToolsService) {}
}
