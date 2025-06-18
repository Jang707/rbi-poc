import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';

const HomeContainer = styled.div`
  padding: 2rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 200px);
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
  text-align: center;
`;

const SubTitle = styled.p`
  font-size: 1.2rem;
  color: var(--light-text-color);
  margin-bottom: 2rem;
  text-align: center;
  max-width: 600px;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
  font-weight: 600;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--accent-color);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: wait;
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const FeatureList = styled.ul`
  list-style-type: none;
  margin: 2rem 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
  max-width: 800px;
`;

const FeatureItem = styled.li`
  background-color: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex: 0 0 calc(33.333% - 1rem);
  min-width: 240px;
  
  h3 {
    margin-bottom: 0.5rem;
    color: var(--primary-color);
  }
  
  p {
    color: var(--light-text-color);
    font-size: 0.9rem;
  }
`;

const HomePage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const createNewSession = async () => {
    setLoading(true);
    
    try {
      const response = await axios.post('/api/sessions');
      const { sessionId } = response.data;
      
      // 생성된 세션으로 이동
      navigate(`/session/${sessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to create new session. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <HomeContainer>
      <Title>Secure Browsing with Pixel Push RBI</Title>
      <SubTitle>
        Experience safe, isolated web browsing with our Remote Browser Isolation solution.
        Your web content stays in the cloud, only pixels reach your device.
      </SubTitle>
      
      <Button onClick={createNewSession} disabled={loading}>
        {loading ? (
          <>
            <LoadingSpinner /> Starting Secure Browser...
          </>
        ) : (
          'Start Secure Browsing'
        )}
      </Button>
      
      <FeatureList>
        <FeatureItem>
          <h3>Protection from Malware</h3>
          <p>Web content is executed in isolated containers, keeping threats away from your device.</p>
        </FeatureItem>
        <FeatureItem>
          <h3>Data Privacy</h3>
          <p>Only screen pixels are transmitted to your device, not the actual web content.</p>
        </FeatureItem>
        <FeatureItem>
          <h3>Seamless Experience</h3>
          <p>Use the web normally with minimal latency and full browser functionality.</p>
        </FeatureItem>
      </FeatureList>
    </HomeContainer>
  );
};

export default HomePage;
