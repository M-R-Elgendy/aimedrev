import { Injectable } from '@nestjs/common';
import * as showdown from 'showdown';

@Injectable()
export class MarkdownService {
    private converter: showdown.Converter;

    constructor() {
        this.converter = new showdown.Converter();
    }

    convertToHtml(markdown: string): string {
        const htmlString: string = this.converter.makeHtml(markdown);
        return htmlString.replace(/\n/g, '<br>');
    }
}
