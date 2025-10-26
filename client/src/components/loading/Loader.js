import React from 'react';
import spinner from '../../assets/icons/spinning-circles.svg?url'
import './Loader.scss'

const Loader = () => (
  <>
    <img className="spinner-circles" src={spinner} />
  </>
);

export default Loader;
