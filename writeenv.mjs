// read template.env and create .env while filling in the necessary values in
// template variables (e.g. {{ redis_port }})

import { promises as fs } from 'fs';
import path from 'path';

