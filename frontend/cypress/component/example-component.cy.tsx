import { useEffect, useState } from 'react';

export const TestComponent = (props: { timeToDone: number }) => {
  const [state, setState] = useState('Not done');
  useEffect(() => {
    const timer = setTimeout(() => {
      setState('Done');
    }, props.timeToDone);

    return () => clearTimeout(timer);
  }, [props.timeToDone]);
  return <div data-cy="state">{state}</div>;
};

describe('Example component', () => {
  it('should render correct html structure', () => {
    cy.mount(<TestComponent timeToDone={200} />);
    cy.get('[data-cy="state"]').should('have.text', 'Not done');
    cy.wait(201);
    cy.get('[data-cy="state"]').should('have.text', 'Done');
  });
});
