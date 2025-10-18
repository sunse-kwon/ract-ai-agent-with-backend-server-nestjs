import { Test, TestingModule } from '@nestjs/testing';
import { VectorToolsService } from './tools.service';

describe('ToolsService', () => {
  let service: VectorToolsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VectorToolsService],
    }).compile();

    service = module.get<VectorToolsService>(VectorToolsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
