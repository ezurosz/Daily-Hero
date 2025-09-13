import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodexBlock } from './codex-block';

describe('CodexBlock', () => {
  let component: CodexBlock;
  let fixture: ComponentFixture<CodexBlock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodexBlock]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodexBlock);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
