import {
  Controller, Get, Hidden, Route,
} from '../../../src';
import { TestModel } from '../../fixtures/testModel';
import { ModelService } from '../services/modelService';

@Route('HiddenController')
@Hidden()
export class HiddenController extends Controller {

  @Get('someMethod')
  public async someMethod(): Promise<TestModel> {
      return Promise.resolve(new ModelService().getModel());
  }

}
