import { Controller, Get, Patch, Post, Put, Body, BodyProp } from '../../../src'
import { ModelService } from '../services/modelService'

class SuperBaseController<T> extends Controller {
  @Patch('SuperBasePatch')
  public async superBasePatch(): Promise<T> {
    return (new ModelService().getModel() as unknown) as T
  }
}

export class BaseController<T> extends SuperBaseController<T> {
  @Get('Get')
  public async getMethod(): Promise<T> {
    return (new ModelService().getModel() as unknown) as T
  }

  @Post('Post')
  public async postMethod(@Body() obj: T): Promise<T> {
    return (new ModelService().getModel() as unknown) as T
  }

  @Get('Base')
  public async baseMethod(): Promise<T> {
    return (new ModelService().getModel() as unknown) as T
  }

  @Put('OverwrittenMethod')
  public async putMethod(@BodyProp() param1: T, @BodyProp() param2: T): Promise<T> {
    return (new ModelService().getModel() as unknown) as T
  }
}
