import type {AnyTest} from '../types';
import {c100Test} from './c100';
import {cityTest} from './city';
import {d15Test, lanthonyTest} from './d15';
import {hrrTest} from './hrr';
import {ishiharaTest} from './ishihara';

export const CV_TESTS: AnyTest[] = [ishiharaTest, hrrTest, d15Test, lanthonyTest, c100Test, cityTest];
