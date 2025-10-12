import { DatabaseService } from './database.service';
import { Controller, Get, Post, Body, Patch, Param, Delete, Put, HttpException, HttpStatus, Query } from '@nestjs/common';
import { VectorDbPayloadDto, VectorDbFilterDto, VectorDbBatchPayloadDto } from './dto/vector-db.dto';
import { Public } from '../../decorator/guard.decorator';


@Controller('database')
export class DatabaseController {
  constructor(
    private readonly databaseService: DatabaseService
  ) {}

  @Public()
  @Post('vector-db')
  async createVectorDb(@Body() body: VectorDbPayloadDto) {
    const pointId = await this.databaseService.create(
      body.text,
      body.labels,
      body.company,
      body.metadata
    );
    if (!pointId) {
      throw new HttpException('Create failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return { point_id: pointId };
  }

  @Public()
  @Post('vector-db/batch')
  async createBatchVectorDb(@Body() body: VectorDbBatchPayloadDto) {
    const items = body.items;
    // console.log(items)
    if (!items || items.length === 0) {
      throw new HttpException('No items provided', HttpStatus.BAD_REQUEST)
    }
    // Parallel inserts using Promise.allSettled
    const promises = items.map(
      item => this.databaseService
      .create(item.text, item.labels, item.company, item.metadata)
      .then(pointId => ({pointId, success: true}))
      .catch(err => ({ pointId: null, success: false, error: err.message}))
    );

    const results = await Promise.allSettled(promises);
    // Normalize results
    const formattedResults = results.map(
      res => res.status ==='fulfilled' ? res.value : {pointId: null, success:false, error: 'Unknown Error'} 
    );
    return { results : formattedResults }
  }

  @Public()
  @Get('vector-db')
  async getVectorDbList(@Query() filter: VectorDbFilterDto) {
    const result = this.databaseService.read(undefined, filter.company, filter.labels);
    // console.log(result) // Promise { <pending> }
    return result
  }
  
  @Public()
  @Get('vector-db/:pointId')
  async getVectorDbDetail(@Param('pointId') pointId: string) {
    try {
      const result = await this.databaseService.read(pointId);
      if (!result) {
        throw new HttpException('Point not found', HttpStatus.NOT_FOUND);
      }
      return result;
    } catch (error) {
      throw new HttpException(`Detail retrieval failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Put('vector-db/:pointId')
  async updateVectorDb(@Param('pointId') pointId: string, @Body() body: any) {
    const payload: Partial<VectorDbPayloadDto> = body?.payload ?? body ?? {};

    const success = await this.databaseService.update(
      pointId,
      payload.text,
      payload.labels,
      payload.company,
      payload.metadata
    );
    if (!success) {
      throw new HttpException('Point not found', HttpStatus.NOT_FOUND);
    }
    return { status: 'updated' };
  }

  @Public()
  @Delete('vector-db/:pointId')
  async deleteVectorDb(@Param('pointId') pointId: string) {
    const success = await this.databaseService.delete(pointId);
    if (!success) {
      throw new HttpException('Point not found', HttpStatus.NOT_FOUND);
    }
    return { status: 'deleted' };
  }
}

