import { Type, applyDecorators } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiProperty,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export class StandartResponse<TData> {
  @ApiProperty({ example: 200 })
  status: number;

  @ApiProperty({ example: 'ok' })
  message: string;

  data: TData;
}

export class StandartResponseCreate<TData> {
  @ApiProperty({ example: 201 })
  status: number;

  @ApiProperty({ example: 'created' })
  message: string;

  data: TData;
}

export class StandartResponseDelete {
  @ApiProperty({ example: 200 })
  status: number;

  @ApiProperty({ example: 'deleted' })
  message: string;

  data: null;
}

// schema array dengan pagination
export const ApiStandartResponseArrayWithPagination = <
  DataDto extends Type<unknown>,
>(
  dataDto: DataDto,
) =>
  applyDecorators(
    ApiExtraModels(StandartResponse, dataDto),
    ApiResponse({ status: 400, description: 'Bad Request' }),
    ApiResponse({ status: 500, description: 'Server Error' }),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(StandartResponse) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(dataDto) },
              },
              pagination: {
                type: 'object',
                properties: {
                  limit: { type: 'number', example: 10 },
                  page: { type: 'number', example: 1 },
                  total_pages: { type: 'number', example: 1 },
                  total_datas: { type: 'number', example: 1 },
                },
              },
            },
          },
        ],
      },
    }),
  );

// schema array tanpa pagination
export const ApiStandartResponseArray = <DataDto extends Type<unknown>>(
  dataDto: DataDto,
) =>
  applyDecorators(
    ApiExtraModels(StandartResponse, dataDto),
    ApiResponse({ status: 400, description: 'Bad Request' }),
    ApiResponse({ status: 500, description: 'Server Error' }),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(StandartResponse) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(dataDto) },
              },
            },
          },
        ],
      },
    }),
  );

// schema standar (single object) - dataDto optional for ledger/raw responses
export function ApiStandartResponse<DataDto extends Type<unknown>>(
  dataDto?: DataDto,
) {
  if (dataDto) {
    return applyDecorators(
      ApiExtraModels(StandartResponse, dataDto),
      ApiResponse({ status: 400, description: 'Bad Request' }),
      ApiResponse({ status: 500, description: 'Server Error' }),
      ApiOkResponse({
        schema: {
          allOf: [
            { $ref: getSchemaPath(StandartResponse) },
            { properties: { data: { $ref: getSchemaPath(dataDto) } } },
          ],
        },
      }),
    );
  }
  return applyDecorators(
    ApiExtraModels(StandartResponse),
    ApiResponse({ status: 400, description: 'Bad Request' }),
    ApiResponse({ status: 500, description: 'Server Error' }),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(StandartResponse) },
          { properties: { data: { type: 'object' } } },
        ],
      },
    }),
  );
}

// schema create
export const ApiStandartResponseCreate = <DataDto extends Type<unknown>>(
  dataDto: DataDto,
) =>
  applyDecorators(
    ApiExtraModels(StandartResponseCreate, dataDto),
    ApiResponse({ status: 400, description: 'Bad Request' }),
    ApiResponse({ status: 500, description: 'Server Error' }),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(StandartResponseCreate) },
          {
            properties: {
              data: { $ref: getSchemaPath(dataDto) },
            },
          },
        ],
      },
    }),
  );

// schema delete
export const ApiStandartResponseDelete = () =>
  applyDecorators(
    ApiResponse({ status: 200, description: 'Deleted' }),
    ApiResponse({ status: 400, description: 'Bad Request' }),
    ApiResponse({ status: 500, description: 'Server Error' }),
  );
