# PVPC

El precio regulado de la luz, **PVPC** (Precio Voluntario para el Pequeño
Consumidor, tarifa 2.0TD), hora a hora en Gladys: el precio de la hora actual, las
horas más baratas del día, el periodo 2.0TD, un gráfico de los precios de hoy y de
mañana, disparadores y una acción de escena para poner en marcha sus aparatos
cuando la luz está más barata.

Los precios proceden de los datos abiertos de [Red Eléctrica](https://www.ree.es)
(REE). Esta integración no tiene relación con Red Eléctrica. Se ha probado con la
API real de REE, pero todavía no en el Gladys de un cliente real del PVPC: sus
comentarios son bienvenidos.

## Presentación

El PVPC es la tarifa regulada de las comercializadoras de referencia (Energía XXI,
Curenergía, Baser, Régsiti…) para los contratos de hasta 10 kW. Su precio de la
energía cambia cada hora. Red Eléctrica lo publica, sin cuenta ni clave, el día
anterior hacia las 20:15.

El precio mostrado es el **término de energía del PVPC 2.0TD** en €/kWh: energía,
peajes y cargos incluidos, **sin impuestos** (impuesto especial sobre la
electricidad e IVA o IGIC), como la integración `pvpc_hourly_pricing` de Home
Assistant y la web de REE. El término de potencia no está incluido.

Un día va de medianoche a medianoche en Madrid, con 23 o 25 horas los días de
cambio de hora. Las horas se muestran en hora peninsular, o en hora local en
Canarias.

## Requisitos

- Gladys Assistant 5.1.0 o posterior.
- Acceso a Internet desde Gladys hacia `apidatos.ree.es`.
- Nada más: ni cuenta, ni clave de API, ni hardware.

## Instalación

1. En Gladys, abra **Integraciones → Instalar desde GitHub** e introduzca
   `https://github.com/guim31/gladys-pvpc`.
2. Abra la integración, elija su zona y guarde.
3. Abra la pestaña **Descubrir** y añada el dispositivo **PVPC**.
4. En un panel, añada el widget **Precios de la luz PVPC**.

## Configuración

| Campo                                  | Por defecto | Qué hace                                                                                |
| -------------------------------------- | ----------- | --------------------------------------------------------------------------------------- |
| Zona                                   | Península   | Península, Islas Baleares, Islas Canarias, Ceuta o Melilla: geo id, horas 2.0TD, reloj  |
| Idioma de los nombres de las funciones | Francés     | Se usa al añadir el dispositivo: los nombres ya no cambian después (elija aquí Español) |

El botón **Consultar los precios ahora** consulta Red Eléctrica en el acto y
muestra lo que publica para hoy y mañana: útil para comprobar la conexión.

## El dispositivo PVPC

Un único dispositivo, de solo lectura, que la propia integración actualiza cada
minuto (los precios se leen de Red Eléctrica una vez por hora).

| Función                           | Tipo     | Valor                                                                       |
| --------------------------------- | -------- | --------------------------------------------------------------------------- |
| Precio actual (€/kWh)             | Precio   | Precio de la hora actual                                                    |
| Precio próxima hora (€/kWh)       | Precio   | Precio de la hora siguiente (después de las 23:00, cuando se conoce mañana) |
| Precio medio de hoy (€/kWh)       | Precio   | Media de las horas del día                                                  |
| Precio mínimo de hoy (€/kWh)      | Precio   | Hora más barata del día                                                     |
| Precio máximo de hoy (€/kWh)      | Precio   | Hora más cara del día                                                       |
| Hora más barata de hoy            | Texto    | Inicio de la hora más barata, `HH:MM`                                       |
| Hora más barata restante          | Texto    | Inicio de la hora más barata que aún no ha pasado (la actual incluida)      |
| Hora más cara de hoy              | Texto    | Inicio de la hora más cara, `HH:MM`                                         |
| Rango de la hora (1 = más barata) | Contador | Rango de la hora actual en el día, de 1 a 24 (23 o 25 al cambiar la hora)   |
| Periodo 2.0TD (1 punta, 3 valle)  | Contador | 1 punta, 2 llano, 3 valle                                                   |
| Periodo tarifario 2.0TD           | Texto    | El mismo periodo, por su nombre («Valle (P3)»)                              |
| Precios de mañana publicados      | Binario  | 1 cuando Red Eléctrica ha publicado los precios de mañana (hacia las 20:15) |

Los periodos 2.0TD, en la hora local de su zona. De lunes a viernes: valle de 0 a
8 h; punta de 10 a 14 h y de 18 a 22 h (Ceuta y Melilla: de 11 a 15 h y de 19 a
23 h); llano el resto de horas. Sábados, domingos y festivos nacionales de fecha fija
(1 de enero, 6 de enero, 1 de mayo, 15 de agosto, 12 de octubre, 1 de noviembre, 6 y
8 de diciembre, 25 de diciembre): valle todo el día.

Gladys no tiene unidad €/kWh: los precios se muestran en euros y el nombre indica
por qué.

## Widget del panel

**Precios de la luz PVPC** muestra tres casillas (ahora, próxima hora, media de
hoy), el gráfico de hoy y de mañana con la hora más barata y la más cara de cada día
marcadas y una línea en la hora actual, y después el periodo 2.0TD actual, la hora
más barata restante, la hora más barata y la media de mañana. Antes de la
publicación indica que los precios de mañana llegan hacia las 20:15.

## Disparadores de escena

Cuatro disparadores, en el editor de escenas bajo **PVPC**. Los tres primeros se
refieren a las horas del día en curso (de medianoche a medianoche, hora de Madrid).

### Empiezan las horas más baratas del día

Se dispara una vez al día, al inicio del tramo de horas consecutivas más barato del
día. Elija la duración: de 1 a 6 u 8 horas (1 hora es la hora más barata del día).
Variables: precio medio del tramo, hora de inicio y de fin.

### Empieza una de las horas más baratas

Se dispara al inicio de cada una de las N horas más baratas del día, consecutivas o
no. Elija N: de 1 a 6, 8, 10 o 12. Variables: precio de la hora, su rango, hora de
inicio y de fin.

### El precio baja de un umbral

Se dispara cuando el precio pasa por debajo del umbral elegido (de 0,05 a
0,25 €/kWh): al inicio de la primera hora por debajo, cuando la hora anterior
estaba por encima. Una vez por serie de horas baratas, no cada hora. Variables:
precio de la hora, número de horas por debajo del umbral, inicio y fin de la serie
(hasta donde se conocen los precios).

### Se publican los precios de mañana

Se dispara una vez al día, cuando Red Eléctrica publica los precios de mañana
(hacia las 20:15). Variables: precio medio, mínimo y máximo de mañana, la hora más
barata y la más cara, y el inicio de las 3 horas más baratas. Los precios
descubiertos después de las 23:00 (Madrid), por ejemplo al instalar, no se anuncian.

Los disparadores horarios saltan al empezar la hora, con 10 minutos de retraso como
máximo (reinicio de Gladys o de la integración): una hora que empezó hace más tiempo
no dispara nada.

## Acción de escena

**Buscar las horas más baratas antes de una hora límite** busca, desde ahora, el
tramo de N horas consecutivas (de 1 a 6 u 8) más barato que termine antes de la hora
elegida (la próxima vez que llegue, hoy o mañana), o sin límite entre todos los
precios conocidos. Un tramo solo puede empezar en la hora actual durante sus 10
primeros minutos.

Devuelve `found`, `starts_now`, `start_time`, `end_time`, `average_price` y
`minutes_to_start` a las acciones siguientes de la escena. Si la hora límite está
más allá de los precios conocidos (por la tarde, para la mañana siguiente), busca
entre las horas conocidas: ejecútela después de las 20:30 para incluir la noche.

## Ejemplos de escenas

- **Lavavajillas en las 3 horas más baratas**: disparador _Empiezan las horas más
  baratas del día_, 3 horas → encender el enchufe del lavavajillas.
- **Colada terminada antes de las 07:00**: todos los días a las 21:00, acción _Buscar
  las horas más baratas antes de una hora límite_, 2 horas antes de las 07:00 → si
  `starts_now` es verdadero, encender el enchufe; si no, enviar «Lavadora: empezar a
  las {{start_time}}».
- **Termo solo en valle**: cuando _Periodo 2.0TD_ vale 3 → encender el termo;
  cuando vale 1 → apagarlo.
- **Aviso por la noche**: disparador _Se publican los precios de mañana_ → enviar
  «Mañana: media {{average_price}} €/kWh, lo más barato a las {{cheapest_time}}».

## Consultas y uso de la API

Red Eléctrica no publica ningún límite para su API de datos abiertos. La integración
hace un uso moderado:

- una petición por hora, que cubre tres días (ayer, hoy y mañana);
- a partir de las 20:15 (Madrid), una petición más cada 15 minutos hasta que se
  publican los precios de mañana, y después de nuevo una por hora;
- tras un fallo, nuevo intento a los 5, 10, 20, 40 y luego 60 minutos; mientras
  tanto se siguen usando los últimos precios conocidos (los precios se conocen con un
  día de antelación).

Los estados solo se publican cuando cambian, con un recordatorio cada 6 horas.

## Solución de problemas

- **«No se puede acceder a Red Eléctrica»** en la pantalla de configuración: Gladys
  no tiene acceso a Internet, o la API de REE no funciona (responde HTTP 502 «Los
  datos solicitados no están disponibles» durante su mantenimiento). Se siguen usando
  los últimos precios conocidos; pulse **Consultar los precios ahora** para volver a
  intentarlo.
- **«no publica ningún precio PVPC para hoy»**: REE ha respondido sin los precios
  del día. La integración lo vuelve a intentar cada hora.
- **Ningún valor en el dispositivo**: añada primero el dispositivo desde la pestaña
  Descubrir; sus valores llegan en el acto.
- **Horas desplazadas una hora**: compruebe la zona (Canarias tiene una hora menos
  que la Península).
- **Registros de depuración**: configure `LOG_LEVEL=debug` en el contenedor para ver
  cada consulta.

## Limitaciones

- El término de energía del PVPC 2.0TD, sin impuestos: ni el término de potencia, ni
  el impuesto sobre la electricidad, ni el IVA/IGIC, ni el alquiler del contador. Los
  contratos del mercado libre tienen sus propios precios.
- Precios horarios: el PVPC se sigue fijando por horas, aunque el mercado spot
  negocia cuartos de hora desde octubre de 2025.
- No se usa la API opcional de ESIOS (con token personal): la API de datos abiertos
  basta para el PVPC.
- Los disparadores solo miran el día en curso: un tramo nunca cruza la medianoche
  (la acción de escena, sí).
- Los festivos autonómicos no cambian los periodos 2.0TD (regla de la CNMC), ni
  tampoco el Viernes Santo.
- Solo lectura: la integración no controla nada por sí misma.
- Los nombres de las funciones se fijan al añadir el dispositivo; cambiar el idioma
  después no los renombra.
