-- Trigger functions
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.make_mtime = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_model_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.model_mtime = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_trim_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.trim_mtime = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_rooftop_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.rt_mdate = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_vehicle_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.veh_mtime = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_images_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.mtime = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table "make"
CREATE TABLE make (
  id SERIAL PRIMARY KEY,
  make VARCHAR(255) NOT NULL UNIQUE,
  make_ctime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  make_mtime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  make_dtime TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
);

CREATE TRIGGER update_make_modtime
  BEFORE UPDATE ON make
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

-- Table "model"
CREATE TABLE model (
  id SERIAL PRIMARY KEY,
  make_id INTEGER NOT NULL,
  model VARCHAR(255),
  model_ctime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  model_mtime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  model_dtime TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_make_id ON model(make_id);

CREATE TRIGGER update_model_modtime
  BEFORE UPDATE ON model
  FOR EACH ROW
  EXECUTE FUNCTION update_model_modified_column();

-- Table "trim"
CREATE TABLE trim (
  id SERIAL PRIMARY KEY,
  make_id INTEGER NOT NULL,
  model_id INTEGER NOT NULL,
  trim VARCHAR(255) NOT NULL,
  trim_ctime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trim_mtime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trim_dtime TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_trim_make_id ON trim(make_id);
CREATE INDEX idx_trim_model_id ON trim(model_id);

CREATE TRIGGER update_trim_modtime
  BEFORE UPDATE ON trim
  FOR EACH ROW
  EXECUTE FUNCTION update_trim_modified_column();

-- Table "rooftop"
CREATE TABLE rooftop (
  rt_id        SERIAL PRIMARY KEY,
  rt_guid      UUID DEFAULT gen_random_uuid(),
  rt_dealer_id VARCHAR(255) NOT NULL UNIQUE,
  rt_name      TEXT,
  rt_street    TEXT,
  rt_city      VARCHAR(255),
  rt_state     VARCHAR(255),
  rt_zip       VARCHAR(255),
  rt_ph        VARCHAR(255),
  rt_carfax    VARCHAR(255),
  rt_email     TEXT,
  rt_site      TEXT,
  rt_inactive  BOOLEAN NOT NULL DEFAULT FALSE,
  rt_cdate     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rt_mdate     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_rooftop_modtime
  BEFORE UPDATE ON rooftop
  FOR EACH ROW
  EXECUTE FUNCTION update_rooftop_modified_column();

-- Table "vehicles"
CREATE TABLE vehicles (
  veh_id SERIAL PRIMARY KEY,
  veh_rt_id INTEGER DEFAULT NULL,
  veh_guid UUID DEFAULT gen_random_uuid(),
  veh_stock VARCHAR(255) DEFAULT NULL,
  veh_vin VARCHAR(255) DEFAULT NULL UNIQUE,
  veh_active SMALLINT DEFAULT 0,
  veh_listing_type TEXT,
  veh_certified TEXT DEFAULT NULL,
  veh_year INTEGER DEFAULT 0,
  veh_make_id INTEGER DEFAULT NULL,
  veh_model_id INTEGER DEFAULT NULL,
  veh_trim_id INTEGER DEFAULT NULL,
  veh_mod_num VARCHAR(30) DEFAULT NULL,
  veh_body_type VARCHAR(125) DEFAULT NULL,
  veh_ext_color VARCHAR(255) DEFAULT NULL,
  veh_int_color VARCHAR(255) DEFAULT NULL,
  veh_miles VARCHAR(255) DEFAULT NULL,
  veh_status BOOLEAN DEFAULT TRUE,
  vh_options_mongo_id VARCHAR(64),
  vh_description_mongo_id VARCHAR(64),
  veh_ctime TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  veh_mtime TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  veh_dtime TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_vehicles_make_id ON vehicles(veh_make_id);
CREATE INDEX idx_vehicles_model_id ON vehicles(veh_model_id);
CREATE INDEX idx_vehicles_trim_id ON vehicles(veh_trim_id);
CREATE INDEX idx_vehicles_vh_options_mongo_id ON vehicles(vh_options_mongo_id);
CREATE INDEX idx_vehicles_vh_description_mongo_id ON vehicles(vh_description_mongo_id);

CREATE TRIGGER update_vehicle_modtime
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_modified_column();

-- Table "images"
CREATE TABLE images (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL UNIQUE,
  image_src TEXT NULL,
  ctime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mtime TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dtime TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_images_vehicle_id ON images(vehicle_id);

CREATE TRIGGER update_images_modtime
  BEFORE UPDATE ON images
  FOR EACH ROW
  EXECUTE FUNCTION update_images_modified_column();

-- Table "import_jobs"
CREATE TABLE IF NOT EXISTS import_jobs (
    ij_id SERIAL PRIMARY KEY,
    ij_source VARCHAR(255) NOT NULL,
    ij_status VARCHAR(255) NOT NULL,
    ij_total_records INTEGER NOT NULL DEFAULT 0,
    ij_duration_hours INTEGER NOT NULL DEFAULT 0,
    ij_duration_time TEXT NOT NULL DEFAULT '00:00:00',
    ij_start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ij_end_time TIMESTAMP,
    ij_file_name VARCHAR(255),
    ij_file_size BIGINT,
    ij_error_message TEXT
);

-- Table "import_file_jobs"
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
    ifj_deleted_records INTEGER DEFAULT 0,
    ifj_start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ifj_end_time TIMESTAMP,
    ifj_error_message TEXT
);
-- --------------------------------------------------------

ALTER TABLE make ADD CONSTRAINT uq_make_make UNIQUE (make);
ALTER TABLE model ADD CONSTRAINT uq_model_make UNIQUE (make_id, model);
ALTER TABLE trim ADD CONSTRAINT uq_trim_make_model UNIQUE (make_id, model_id, trim);
ALTER TABLE vehicles ADD CONSTRAINT uq_vehicles_vin UNIQUE (veh_vin);
ALTER TABLE images ADD CONSTRAINT uq_images_vehicle UNIQUE (vehicle_id, image_src);


