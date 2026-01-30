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



CREATE TABLE veh_make (
  id SERIAL PRIMARY KEY,
  make VARCHAR(255) NOT NULL UNIQUE,
  make_ctime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  make_mtime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  make_dtime TIMESTAMP DEFAULT NULL
);

CREATE TRIGGER update_make_modtime
  BEFORE UPDATE ON veh_make
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();


CREATE TABLE veh_model (
  id SERIAL PRIMARY KEY,
  make_id INTEGER NOT NULL,
  model VARCHAR(255) NOT NULL,
  model_ctime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  model_mtime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  model_dtime TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_veh_model_make_id ON veh_model(make_id);

CREATE TRIGGER update_model_modtime
  BEFORE UPDATE ON veh_model
  FOR EACH ROW
  EXECUTE FUNCTION update_model_modified_column();

ALTER TABLE veh_model ADD CONSTRAINT uq_model_make UNIQUE (make_id, model);


CREATE TABLE veh_trim (
  id SERIAL PRIMARY KEY,
  make_id INTEGER NOT NULL,
  model_id INTEGER NOT NULL,
  trim VARCHAR(255) NOT NULL,
  trim_ctime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trim_mtime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trim_dtime TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_trim_make_id ON veh_trim(make_id);
CREATE INDEX idx_trim_model_id ON veh_trim(model_id);

CREATE TRIGGER update_trim_modtime
  BEFORE UPDATE ON veh_trim
  FOR EACH ROW
  EXECUTE FUNCTION update_trim_modified_column();

ALTER TABLE veh_trim ADD CONSTRAINT uq_trim_make_model UNIQUE (make_id, model_id, trim);


CREATE TABLE rooftop (
  rt_id SERIAL PRIMARY KEY,
  rt_guid UUID DEFAULT gen_random_uuid(),
  rt_dealer_id VARCHAR(255) NOT NULL UNIQUE,
  rt_name TEXT,
  rt_street TEXT,
  rt_city VARCHAR(255),
  rt_state VARCHAR(255),
  rt_zip VARCHAR(255),
  rt_ph VARCHAR(255),
  rt_carfax VARCHAR(255),
  rt_email TEXT,
  rt_site TEXT,
  rt_inactive BOOLEAN NOT NULL DEFAULT FALSE,
  rt_cdate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rt_mdate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_rooftop_modtime
  BEFORE UPDATE ON rooftop
  FOR EACH ROW
  EXECUTE FUNCTION update_rooftop_modified_column();



CREATE TABLE vehicles (
  veh_id SERIAL PRIMARY KEY,
  veh_rt_id INTEGER,
  veh_guid UUID DEFAULT gen_random_uuid(),
  veh_stock VARCHAR(255),
  veh_vin VARCHAR(255) UNIQUE,
  veh_active SMALLINT DEFAULT 0,
  veh_listing_type TEXT,
  veh_certified TEXT,

  veh_make_id INTEGER,
  veh_model_id INTEGER,
  veh_trim_id INTEGER,
  veh_model_num VARCHAR(255),

  veh_year_id INTEGER,
  veh_body_type_id INTEGER,
  veh_ext_color_id INTEGER,
  veh_int_color_id INTEGER,

  veh_miles VARCHAR(255),
  veh_status BOOLEAN DEFAULT TRUE,

  veh_options_mng_id VARCHAR(64),
  veh_description_mng_id VARCHAR(64),

  veh_ctime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  veh_mtime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  veh_dtime TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_vehicles_make_id ON vehicles(veh_make_id);
CREATE INDEX idx_vehicles_model_id ON vehicles(veh_model_id);
CREATE INDEX idx_vehicles_trim_id ON vehicles(veh_trim_id);
CREATE INDEX idx_vehicles_year_id ON vehicles(veh_year_id);
CREATE INDEX idx_vehicles_body_type_id ON vehicles(veh_body_type_id);
CREATE INDEX idx_vehicles_ext_color_id ON vehicles(veh_ext_color_id);
CREATE INDEX idx_vehicles_int_color_id ON vehicles(veh_int_color_id);
CREATE INDEX idx_vehicles_options_mng_id ON vehicles(veh_options_mng_id);
CREATE INDEX idx_vehicles_description_mng_id ON vehicles(veh_description_mng_id);

CREATE TRIGGER update_vehicle_modtime
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_modified_column();


CREATE TABLE veh_images (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL UNIQUE,
  image_src TEXT,
  ctime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mtime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dtime TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_images_vehicle_id ON veh_images(vehicle_id);

CREATE TRIGGER update_images_modtime
  BEFORE UPDATE ON veh_images
  FOR EACH ROW
  EXECUTE FUNCTION update_images_modified_column();


CREATE TABLE veh_body_type (
  id SERIAL PRIMARY KEY,
  body_type VARCHAR(255) NOT NULL UNIQUE,
  ctime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mtime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dtime TIMESTAMP DEFAULT NULL
);

CREATE OR REPLACE FUNCTION update_body_type_mtime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.mtime = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_body_type_modtime
  BEFORE UPDATE ON veh_body_type
  FOR EACH ROW
  EXECUTE FUNCTION update_body_type_mtime();


CREATE TABLE veh_color (
  id SERIAL PRIMARY KEY,
  color VARCHAR(255) NOT NULL UNIQUE,
  ctime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mtime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dtime TIMESTAMP DEFAULT NULL
);

CREATE OR REPLACE FUNCTION update_color_mtime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.mtime = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_color_modtime
  BEFORE UPDATE ON veh_color
  FOR EACH ROW
  EXECUTE FUNCTION update_color_mtime();


CREATE TABLE veh_year (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  ctime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mtime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  dtime TIMESTAMP DEFAULT NULL
);

CREATE OR REPLACE FUNCTION update_vehicle_year_mtime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.mtime = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicle_year_modtime
  BEFORE UPDATE ON veh_year
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_year_mtime();


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
