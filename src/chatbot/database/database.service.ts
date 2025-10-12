import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from '@langchain/openai';
import { v4 as uuidv4 } from 'uuid';

export interface VectorResponse {
  id?: string,
  payload: {
  text?: string;
  labels?: string[];
  company?: string;
  metadata?: { created_at?: string } & Record<string, any>;
  [key: string]: any;
  },
  vector?:number[];
}

@Injectable()
export class DatabaseService {
  private qdrant: QdrantClient;
  private embeddings: OpenAIEmbeddings;
  private collectionName = 'agentic-rag-collection';

  constructor(private configService: ConfigService) {
    this.qdrant = new QdrantClient({
      url: this.configService.get<string>('QDRANT_URL'),
    });
    this.embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.initializeCollection();
  }

  async initializeCollection() {
    const exists = await this.qdrant.getCollection(this.collectionName).catch(() => false);
    if (!exists) {
      await this.qdrant.createCollection(this.collectionName, {
        vectors: { size: 1536, distance: 'Cosine' }, // text-embedding-3-small은 1536 차원
      });
      await this.qdrant.createPayloadIndex(this.collectionName, {
        field_name: 'company',
        field_schema: 'keyword',
      });
      await this.qdrant.createPayloadIndex(this.collectionName, {
        field_name: 'labels',
        field_schema: 'keyword',
      });
    }
  }

  async create(text: string, labels?: string[], company?: string, metadata?: Record<string, any>) {
    try {
      const embedding = await this.embeddings.embedQuery(text);
      const pointId = uuidv4();

      // console.log(pointId)

      const payload = {
        text,
        labels: labels || [],
        company,
        metadata: metadata || { created_at: new Date().toISOString() },
      };

      await this.qdrant.upsert(this.collectionName, {
        points: [{ id: pointId, vector: embedding, payload }],
      });
      return pointId;
    } catch (error) {
      throw new HttpException(`Create failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  // list - qdrant 웹페이지에서 나온대로, 읽기, 편집을 목적으로 구현하면 좋을듯.!!
  async read(pointId?: string, companyFilter?: string, labelFilter?: string, limit = 100): Promise<VectorResponse | VectorResponse[] | null> {
    try {
      if (pointId) {
        const result = await this.qdrant.retrieve(this.collectionName, { ids: [pointId], with_vector:true });
        // console.log(result)
        return (result[0] as VectorResponse) || null;
      }

      type FieldMatchCondition = { key: string; match: { value: string } | { any: string[] } };
      const filters: FieldMatchCondition[] = [];
      if (companyFilter) {
        filters.push({ key: 'company', match: { value: companyFilter } });
      }
      if (labelFilter) {
        filters.push({ key: 'labels', match: { any: [labelFilter] } });
      }
      const filter: any = filters.length ? { must: filters } : undefined;

      const { points } = await this.qdrant.scroll(this.collectionName, {
        filter,
        limit,
        with_payload: true,
        with_vector: true,
      });
      
      // console.log(points)

      const results: VectorResponse[] = points as VectorResponse[];
      // console.log(results)

      return results.sort((a, b) => (b.payload.metadata?.created_at ?? '').localeCompare(a.payload.metadata?.created_at ?? ''));
    } catch (error) {
      throw new HttpException(`Read failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  // qdrant 에 클라이언트 페이지에 나온대로 읽기, 편집하면 좋을듯.
  async update(pointId: string, text?: string, labels?: string[], company?: string, metadata?: Record<string, any>) {
    try {
      const existing = await this.qdrant.retrieve(this.collectionName, { ids: [pointId], with_vector: true });
      if (!existing.length) {
        return false;
      }

      const response = existing[0] as VectorResponse;
      if (!response) {
        throw new HttpException('response not found', HttpStatus.NOT_FOUND);
      }

      let vector = existing[0].vector as number[];
      if (text) {
        vector = await this.embeddings.embedQuery(text);
        response.payload.text = text;
      }
      if (labels) response.payload.labels = labels;
      if (company) response.payload.company = company;
      if (metadata) response.payload.metadata = metadata;

      await this.qdrant.upsert(this.collectionName, {
        points: [{ id: pointId, vector: vector, payload: response.payload }],
      });
      return true;
    } catch (error) {
      throw new HttpException(`Update failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async delete(pointId: string) {
    try {
      const result = await this.qdrant.delete(this.collectionName, {
        points: [pointId],
        wait: true,
      });
      return result.status === 'completed';
    } catch (error) {
      throw new HttpException(`Delete failed: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}