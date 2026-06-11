export const environment = {
  production: true,
  // Actualiza esta URL con la del API Gateway en Azure tras el despliegue.
  apiUrl: '/api/v1/emilypamela',
  apiUrlV2: '/api/v2/emilypamela',
  wsUrl: '',  // vacío = mismo origen (nginx proxea /socket.io/ al bus-service)
  appName: 'UrbanCar EC',
  adminCode: 'PUCE2026',
};
