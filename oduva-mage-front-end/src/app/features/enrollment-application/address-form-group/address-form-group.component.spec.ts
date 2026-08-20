import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AddressFormGroupComponent, createAddressFormGroup } from './address-form-group.component';

describe('AddressFormGroupComponent', () => {
  let fixture: ComponentFixture<AddressFormGroupComponent>;
  let component: AddressFormGroupComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddressFormGroupComponent, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AddressFormGroupComponent);
    component = fixture.componentInstance;
  });

  it('requires street1, city, stateRegion, postalCode, and country', () => {
    component.addressGroup = createAddressFormGroup({ label: 'Home' });
    fixture.detectChanges();

    expect(component.addressGroup.get('street1')?.hasError('required')).toBeTrue();
    expect(component.addressGroup.get('city')?.hasError('required')).toBeTrue();
    expect(component.addressGroup.get('stateRegion')?.hasError('required')).toBeTrue();
    expect(component.addressGroup.get('postalCode')?.hasError('required')).toBeTrue();
    expect(component.addressGroup.get('country')?.hasError('required')).toBeTrue();

    component.addressGroup.patchValue({
      street1: '1 Main St',
      city: 'Springfield',
      stateRegion: 'IL',
      postalCode: '62704',
      country: 'USA'
    });

    expect(component.addressGroup.get('street1')?.valid).toBeTrue();
    expect(component.addressGroup.get('city')?.valid).toBeTrue();
    expect(component.addressGroup.get('stateRegion')?.valid).toBeTrue();
    expect(component.addressGroup.get('postalCode')?.valid).toBeTrue();
    expect(component.addressGroup.get('country')?.valid).toBeTrue();
  });

  it('does not require street2', () => {
    component.addressGroup = createAddressFormGroup({ label: 'Home' });
    fixture.detectChanges();

    expect(component.addressGroup.get('street2')?.hasError('required')).toBeFalse();
  });

  describe('additional-address label validation', () => {
    beforeEach(() => {
      component.addressGroup = createAddressFormGroup({ label: '' });
      component.editableLabel = true;
    });

    it('flags a blank label as required when editable', () => {
      component.siblingLabels = [];
      fixture.detectChanges();

      expect(component.addressGroup.get('label')?.hasError('required')).toBeTrue();
    });

    it('flags a label that duplicates a sibling label case-insensitively', () => {
      component.siblingLabels = ['Work'];
      fixture.detectChanges();

      component.addressGroup.get('label')?.setValue('work');

      expect(component.addressGroup.get('label')?.hasError('duplicateLabel')).toBeTrue();
    });

    it('accepts a non-blank, unique label', () => {
      component.siblingLabels = ['Work'];
      fixture.detectChanges();

      component.addressGroup.get('label')?.setValue('Vacation Home');

      expect(component.addressGroup.get('label')?.valid).toBeTrue();
    });
  });
});
