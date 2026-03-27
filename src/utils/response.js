'use strict';

const createSuccessResponse = (data, message = 'Success') => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString(),
});

const createErrorResponse = (message, errors = null, statusCode = 400) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors) response.errors = errors;
  return response;
};

const createPaginatedResponse = (users, pagination) => ({
  success: true,
  data: { users, pagination },
  timestamp: new Date().toISOString(),
});

module.exports = { createSuccessResponse, createErrorResponse, createPaginatedResponse };
