import {
  Controller,
  CustomAttribute,
  Delete,
  Get,
  Patch,
  Post,
  Put,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
  Template,
} from '../../../src';
import { ModelService } from '../services/modelService';
import { ErrorResponseModel, TestModel } from '../testModel';


@Route('MethodTest')
@Template({ CUSTOM: 'customString'})
export class MethodController extends Controller {

    @Get('Get')
    public async getMethod(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Post('Post')
    public async postMethod(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Patch('Patch')
    public async patchMethod(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Put('Put')
    public async putMethod(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Delete('Delete')
    public async deleteMethod(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    /**
     * method description
     */
    @Get('Description')
    public async description(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Tags('Tag1', 'Tag2', 'Tag3')
    @Get('Tags')
    public async tags(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Response<ErrorResponseModel>('400', 'Bad Request')
    @Response<ErrorResponseModel>('401', 'Unauthorized')
    @Response<ErrorResponseModel>('default', 'Unexpected error', { status: 500, message: 'Something went wrong!' })
    @Get('MultiResponse')
    public async multiResponse(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @SuccessResponse('201', 'Created')
    @Get('SuccessResponse')
    public async successResponse(): Promise<void> {
        this.setStatus(201);
        return Promise.resolve();
    }

    @Security('api_key')
    @Get('ApiSecurity')
    public async apiSecurity(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Security('tsoa_auth', ['write:pets', 'read:pets'])
    @Get('OauthSecurity')
    public async oauthSecurity(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Security('tsoa_auth', ['write:pets', 'read:pets'])
    @Security('api_key')
    @Get('OauthOrAPIkeySecurity')
    public async oauthOrAPIkeySecurity(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Security({
      api_key: [],
      tsoa_auth: ['write:pets', 'read:pets'],
    })
    @Get('OauthAndAPIkeySecurity')
    public async oauthAndAPIkeySecurity(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @CustomAttribute('attKey', 'attValue')
    @CustomAttribute('attKey1', { test: 'testVal' })
    @CustomAttribute('attKey2', ['y0', 'y1'])
    @CustomAttribute('attKey3', [{ y0: 'yt0', y1: 'yt1' }, { y2: 'yt2' }])
    @Get('CustomAttribute')
    public async customAttribute(): Promise<TestModel> {
      return new ModelService().getModel();
    }

    /**
     * {$ROUTE} {$PATH} {$METHOD} {$CUSTOM}
     */
    @Get('InterpolatedDescription')
    public async interpolatedDescription(): Promise<TestModel> {
      return new ModelService().getModel();
    }

    /**
     * @deprecated
     */
    @Get('DeprecatedMethod')
    public async deprecatedMethod(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    /**
     * @summary simple summary
     */
    @Get('SummaryMethod')
    public async summaryMethod(): Promise<TestModel> {
        return new ModelService().getModel();
    }

    @Get('returnAnyType')
    public async returnAnyType(): Promise<any> {
        return 'Hello Word';
    }
}
