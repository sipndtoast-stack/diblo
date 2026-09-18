import React from 'react';
import { UnifiedLogin } from './UnifiedLogin';

interface AccessSelectionProps {
  onSelectCustomer: () => void;
  onSelectStaff: () => void;
  onStaffSuccess?: (role: 'Assistant' | 'Admin') => void;
  onApplyAssistant?: () => void;
}

export const AccessSelection: React.FC<AccessSelectionProps> = ({
  onSelectCustomer,
  onSelectStaff,
  onStaffSuccess,
  onApplyAssistant
}) => {
  return (
    <UnifiedLogin
      initialMode="CUSTOMER"
      onCustomerSuccess={onSelectCustomer}
      onStaffSuccess={(role) => {
        if (onStaffSuccess) {
          onStaffSuccess(role);
        } else {
          onSelectStaff();
        }
      }}
      onApplyAssistant={onApplyAssistant}
    />
  );
};

