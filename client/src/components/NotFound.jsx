import React from 'react';
import styled from 'styled-components';

const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
  text-align: center;
`;

const Title = styled.h1`
  font-size: 8rem;
  color: var(--primary-color);
  margin: 0;
`;

const Message = styled.p`
  font-size: 1.5rem;
  color: var(--light-text-color);
  margin: 1rem 0 2rem;
`;

const HomeLink = styled.a`
  color: var(--primary-color);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 1px solid var(--primary-color);
  border-radius: 0.25rem;
  
  &:hover {
    background-color: var(--primary-color);
    color: white;
  }
`;

const NotFound = () => {
  return (
    <NotFoundContainer>
      <Title>404</Title>
      <Message>Page not found</Message>
      <HomeLink href="/">Return to Home</HomeLink>
    </NotFoundContainer>
  );
};

export default NotFound;
