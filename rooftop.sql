CREATE TABLE dealers (
    dealer_id VARCHAR PRIMARY KEY,
    name TEXT,
    address TEXT,
    city TEXT,
    state CHAR(2),
    zip VARCHAR(10),
    phone TEXT,
    fax TEXT,
    email TEXT
);

CREATE TABLE vehicles_private (
    vin CHAR(17) PRIMARY KEY,
    dealer_id VARCHAR REFERENCES dealers(dealer_id),

    stock VARCHAR,
    model_number VARCHAR,
    certified BOOLEAN,

    msrp NUMERIC(10,2),
    selling_price NUMERIC(10,2),
    invoice NUMERIC(10,2),
    book_value NUMERIC(10,2),
    internet_price NUMERIC(10,2),
    misc_price1 NUMERIC(10,2),
    misc_price2 NUMERIC(10,2),
    misc_price3 NUMERIC(10,2),

    factory_codes TEXT,
    comments JSONB,

    website_vdp_url TEXT,

    date_created TIMESTAMP,
    date_modified TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mbusa_import_jobs (
    id SERIAL PRIMARY KEY,

    import_source        VARCHAR(50) NOT NULL,
    job_status           VARCHAR(20) NOT NULL,

    total_records        INTEGER DEFAULT 0,
    skipped_records      INTEGER DEFAULT 0,
    added_records        INTEGER DEFAULT 0,
    updated_records      INTEGER DEFAULT 0,
    no_change_records    INTEGER DEFAULT 0,
    deleted_records      INTEGER DEFAULT 0,

    job_start_time       TIMESTAMP NOT NULL,
    job_end_time         TIMESTAMP,

    duration_hours       INTEGER DEFAULT 0,
    duration_time        INTERVAL DEFAULT '00:00:00',

    error_count          INTEGER DEFAULT 0,
    error_message        TEXT
);



CREATE TABLE IF NOT EXISTS import_jobs (
    ij_id SERIAL PRIMARY KEY,

    ij_source          VARCHAR(255) NOT NULL,
    ij_status          VARCHAR(255) NOT NULL,
    ij_total_records   INTEGER NOT NULL DEFAULT 0,

    ij_duration_hours  INTEGER NOT NULL DEFAULT 0,
    ij_duration_time   INTERVAL NOT NULL DEFAULT '00:00:00',

    ij_start_time      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ij_end_time        TIMESTAMP,

    ij_error_message   TEXT
);

CREATE TABLE IF NOT EXISTS import_file_jobs (
    ifj_id SERIAL PRIMARY KEY,
    ifj_local_file_name VARCHAR(255) NOT NULL,
    ifj_file_size VARCHAR(255) NOT NULL,
    ifj_status VARCHAR(255) NOT NULL,
    ifj_total_records INTEGER NOT NULL DEFAULT 0,
    ifj_skipped_records INTEGER NOT NULL DEFAULT 0,
    ifj_added_records INTEGER NOT NULL DEFAULT 0,
    ifj_updated_records INTEGER NOT NULL DEFAULT 0,
    ifj_no_change_records INTEGER NOT NULL DEFAULT 0,
    ifj_deleted_records      INTEGER DEFAULT 0,

    ifj_start_time      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ifj_end_time        TIMESTAMP,

    ifj_error_message   TEXT
);

CREATE TABLE rooftop (
  rt_id          SERIAL PRIMARY KEY,
  rt_guid        VARCHAR(50) DEFAULT gen_random_uuid(),
  rt_dealer_id   VARCHAR(255) NOT NULL UNIQUE,
  rt_name        VARCHAR(255) NULL,
  rt_street      VARCHAR(255) NULL,
  rt_city        VARCHAR(255) NULL,
  rt_state       VARCHAR(255) NULL,
  rt_zip         VARCHAR(255) NULL,
  rt_ph          VARCHAR(255) NULL,
  rt_email       VARCHAR(255) NULL,
  rt_site        VARCHAR(255) NULL,
  rt_inactive    BOOLEAN NOT NULL DEFAULT FALSE,
  rt_cdate       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rt_mdate       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

    rt_dealer_id ->  Dealer ID
    rt_name  -> Dealer Name
    rt_street -> Dealer Address
    rt_city ->Dealer City
    rt_state -> Dealer State
    rt_zip -> Dealer Zip
    rt_ph -> Dealer phone
    rt_email -> Dealer Email
    rt_site -> Website VDP URL

CREATE TABLE vehicles (
  veh_id SERIAL PRIMARY KEY,
  veh_rt_id INTEGER DEFAULT NULL,
  veh_guid VARCHAR(30) DEFAULT DEFAULT uuid(),
  veh_stock VARCHAR(20) DEFAULT NULL,
  veh_vin VARCHAR(20) DEFAULT NULL,
  veh_active SMALLINT DEFAULT 0,
  veh_listing_type listing_type DEFAULT NULL,
  veh_certified SMALLINT DEFAULT 0,
  veh_year INTEGER DEFAULT 0,
  veh_make_id INTEGER DEFAULT NULL,
  veh_model_id INTEGER DEFAULT NULL,
  veh_trim_id INTEGER DEFAULT NULL,
  veh_mod_num VARCHAR(30) DEFAULT NULL,
  veh_body_type VARCHAR(30) DEFAULT NULL,
  veh_ext_color VARCHAR(20) DEFAULT NULL,
  veh_int_color VARCHAR(20) DEFAULT NULL,
  veh_miles VARCHAR(10) DEFAULT NULL,
  veh_status VARCHAR(20) DEFAULT NULL,
  veh_ctime TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  veh_mtime TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  veh_dtime TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
);

options , desc

CREATE TABLE rooftop (
  rt_id        SERIAL PRIMARY KEY,
  rt_guid      UUID DEFAULT gen_random_uuid(),

  rt_dealer_id VARCHAR(255) NOT NULL UNIQUE,
  rt_name      TEXT ,
  rt_street    TEXT ,
  rt_city      TEXT ,
  rt_state     TEXT ,
  rt_zip        VARCHAR(255) NULL,
  rt_ph        TEXT ,
  rt_email     TEXT ,
  rt_site      TEXT, 

  rt_inactive  BOOLEAN NOT NULL DEFAULT FALSE,
  rt_cdate     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rt_mdate     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE vehicles (
  veh_id SERIAL PRIMARY KEY,
  veh_rt_id INTEGER DEFAULT NULL,
  veh_guid VARCHAR(255)  DEFAULT gen_random_uuid(),
  veh_stock VARCHAR(255) DEFAULT NULL,
  veh_vin VARCHAR(255) DEFAULT NULL,
  veh_active SMALLINT DEFAULT 0,
  veh_listing_type listing_type DEFAULT NULL,
  veh_certified SMALLINT DEFAULT 0,
  veh_year INTEGER DEFAULT 0,
  veh_make_id INTEGER DEFAULT NULL,
  veh_model_id INTEGER DEFAULT NULL,
  veh_trim_id INTEGER DEFAULT NULL,
  veh_mod_num VARCHAR(30) DEFAULT NULL,
  veh_body_type VARCHAR(30) DEFAULT NULL,
  veh_ext_color VARCHAR(20) DEFAULT NULL,
  veh_int_color VARCHAR(20) DEFAULT NULL,
  veh_miles VARCHAR(10) DEFAULT NULL,
  veh_status VARCHAR(20) DEFAULT NULL,
  veh_ctime TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  veh_mtime TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  veh_dtime TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
);

veh_rt_id -> rooftop.rt_id
veh_stock ->Stock
veh_vin -> VIN
veh_active -> 
veh_year -> Year
veh_listing_type -> Type
veh_certified ->Certified
veh_make_id -> make.id
veh_model_id -> model.id
veh_trim_id -> trim.id
veh_body_type ->Body
veh_ext_color ->  ExteriorColor
veh_int_color -> InteriorColor
veh_miles -> Miles
veh_status ->

-- Create indexes
CREATE INDEX idx_vehicles_make_id ON vehicles(veh_make_id);
CREATE INDEX idx_vehicles_model_id ON vehicles(veh_model_id);
CREATE INDEX idx_vehicles_trim_id ON vehicles(veh_trim_id);

CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL,
  image_src VARCHAR(500) NOT NULL,
  ctime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mtime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dtime TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
);
-- Create index on vehicle_id
CREATE INDEX idx_images_vehicle_id ON images(vehicle_id);
vehicle_id -> vehicles.veh_id
image_src -> ImageList
--
-- Table structure for table "trim"
--

CREATE TABLE trim (
  id SERIAL PRIMARY KEY,
  make_id INTEGER NOT NULL,
  model_id INTEGER NOT NULL,
  trim VARCHAR(100) NOT NULL,
  trim_ctime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trim_mtime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trim_dtime TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
);

make_id -> make.id
model_id -> model.id
trim -> Trim

-- Create indexes
CREATE INDEX idx_trim_make_id ON trim(make_id);
CREATE INDEX idx_trim_model_id ON trim(model_id);

CREATE TABLE model (
  id SERIAL PRIMARY KEY,
  make_id INTEGER NOT NULL,
  model VARCHAR(100) NOT NULL,
  model_ctime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  model_mtime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  model_dtime TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
);

make_id -> make.id
model ->Model

-- Create index
CREATE INDEX idx_make_id ON model(make_id);

CREATE TABLE make (
  id SERIAL PRIMARY KEY,
  make VARCHAR(100) NOT NULL,
  make_ctime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  make_mtime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  make_dtime TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
);

make -> Make 