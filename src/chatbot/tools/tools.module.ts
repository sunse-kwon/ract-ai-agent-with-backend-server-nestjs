import { Module } from '@nestjs/common';
import { VectorToolsService } from './tools.service';
import { ToolsController } from './tools.controller';

@Module({
  controllers: [ToolsController],
  providers: [VectorToolsService],
  exports:[VectorToolsService]
})
export class ToolsModule {}
