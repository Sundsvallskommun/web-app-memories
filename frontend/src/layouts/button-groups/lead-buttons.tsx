import { Button } from '@sk-web-gui/react';

export const LeadButtons: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <Button.Group
      className={`flex flex-col mt-[40px] ${
        Array.isArray(children) ? 'sm:flex-row sm:grid sm:grid-cols-2 gap-md sm:gap-[40px]' : ''
      }`}
    >
      {children}
    </Button.Group>
  );
};

export default LeadButtons;
