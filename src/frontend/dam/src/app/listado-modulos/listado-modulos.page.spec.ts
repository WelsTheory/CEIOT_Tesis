import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListadoModulosPage } from './listado-modulos.page';

describe('ListadoModulosPage', () => {
  let component: ListadoModulosPage;
  let fixture: ComponentFixture<ListadoModulosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ListadoModulosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
