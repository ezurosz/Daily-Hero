import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Missoes } from './missoes';

describe('Missoes', () => {
  let component: Missoes;
  let fixture: ComponentFixture<Missoes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Missoes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Missoes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
